/**
 * Mock Studio API. Holds the data in memory (persisted to localStorage) and exposes async calls with
 * realistic latency, so screens are written against an API shape that a real backend can replace.
 */
import { PRICES, seedData, sketchPlan } from '@/data/seed';
import type { Attachment, ChatMessage, LedgerEntry, PageBlock, RequestType, StudioData, StudioRequest, Thread } from '@/data/types';
import { addDays, addWorkingDays, formatShort, shortDay, today, toIsoDay } from '@/lib/date';

const STORAGE_KEY = 'studio.data.v2'; // v2: FS-85 statuses
const LATENCY_MS = 500;
const AGENT_MS = 900;

let db: StudioData = load();
const listeners = new Set<() => void>();

function load(): StudioData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as StudioData;
      // A reply that was in flight when the tab closed never arrives: clear the flag.
      Object.values(data.threads).forEach((th) => (th.typing = false));
      return data;
    }
  } catch {
    /* fall through to seed */
  }
  return seedData();
}

/** Object URLs only live for this tab, so they're dropped before saving. */
function persist() {
  try {
    const clean = JSON.parse(JSON.stringify(db), (k, v) => (k === 'url' ? undefined : v));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* storage unavailable or full: keep going in memory */
  }
}

function commit(mutate: (d: StudioData) => void) {
  const next = structuredClone(db);
  mutate(next);
  db = next;
  persist();
  listeners.forEach((l) => l());
}

const wait = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const todayIso = () => toIsoDay(today());

export function getSnapshot(): StudioData {
  return db;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------- errors ----------

export class ChatOfflineError extends Error {
  constructor() {
    super('agent-ba is offline');
  }
}

export class NotEnoughCreditsError extends Error {
  constructor(public needed: number, public available: number) {
    super('not enough credits');
  }
}

/** `?demo=offline`: the next chat send fails once, so "Try again" can be exercised. */
let failNextSend = 0;
export function simulateOffline(times = 1) {
  failNextSend = times;
}

// ---------- reads ----------

export async function getCredits() {
  await wait(300);
  return { credits: db.credits, ledger: db.ledger };
}

// ---------- credits ----------

function ledger(d: StudioData, entry: Omit<LedgerEntry, 'id' | 'date'>) {
  d.ledger.push({ id: uid(), date: todayIso(), ...entry });
}

function spendFree(d: StudioData, amount: number, text: string) {
  if (d.credits.free < amount) throw new NotEnoughCreditsError(amount, d.credits.free);
  d.credits.free -= amount;
  d.credits.used += amount;
  ledger(d, { text, amount: -amount, kind: 'spend' });
}

export async function requestTopUp() {
  await wait();
  commit((d) => {
    d.credits.topUpRequest = 'waiting';
  });
}

export async function cancelTopUp() {
  await wait();
  commit((d) => {
    d.credits.topUpRequest = 'none';
  });
}

// ---------- chat ----------

function thread(d: StudioData, id: number): Thread {
  const t = d.threads[id];
  if (!t) throw new Error(`No thread #${id}`);
  return t;
}

function nextId(d: StudioData) {
  const ids = [...Object.keys(d.threads).map(Number), ...d.requests.map((r) => r.id), ...d.history.map((h) => h.id)];
  return Math.max(...ids) + 1;
}

export function saveComposer(id: number, text: string) {
  commit((d) => {
    thread(d, id).composer = text;
  });
}

/** Opens a new chat (06 Chat: start). Returns the new thread id; send the first message with sendMessage. */
export function startThread(kind: RequestType): number {
  let id = 0;
  commit((d) => {
    id = nextId(d);
    d.threads[id] = {
      id,
      kind,
      title: kind === 'page' ? 'New page' : 'New change',
      savedOn: todayIso(),
      composer: '',
      cost: kind === 'change' ? PRICES.change : 0,
      setAside: false,
      changes: [],
      plan: kind === 'page' ? [] : undefined,
      previewsUsed: kind === 'page' ? 0 : undefined,
      messages: [{ id: uid(), from: 'agent', text: kind === 'page' ? 'What should the new page be about?' : 'Hi Mei! What would you like to change?' }],
    };
  });
  return id;
}

/** "Done adding changes": the list goes to Chi for planning and checks. */
export async function submitChanges(id: number) {
  await wait();
  commit((d) => {
    const th = thread(d, id);
    d.requests = d.requests.filter((r) => r.id !== id);
    d.requests.push({
      id,
      type: 'change',
      title: th.title,
      status: 'checking',
      currentStep: 1,
      note: `${th.changes.length} ${th.changes.length === 1 ? 'change' : 'changes'} · ${th.cost} credits set aside · before and after by tomorrow`,
      changeCount: th.changes.length,
      credits: th.cost,
      timeline: [
        { when: formatShort(today()), detail: `Planned with agent-ba · ${th.cost} credits set aside` },
        { when: formatShort(addDays(today(), 1)), estimate: true, detail: 'Automatic checks' },
        { when: 'next', detail: 'You check the before and after' },
        { when: 'after you approve', detail: 'Goes live straight away' },
      ],
    });
  });
}

/** Credits a text change is short of before its first send (0 when it can go ahead). */
export function creditsShortFor(id: number): number {
  const th = db.threads[id];
  if (!th || th.kind !== 'change' || th.setAside) return 0;
  return Math.max(0, th.cost - db.credits.free);
}

/**
 * Sends a message and waits for agent-ba's reply.
 * A text change sets its credits aside before anything starts; with too few free credits the
 * message isn't sent and NotEnoughCreditsError is thrown so the screen can route to 13.
 */
export async function sendMessage(id: number, text: string, attachments: Attachment[] = []) {
  const t = db.threads[id];
  if (t.kind === 'change' && !t.setAside && db.credits.free < t.cost) {
    throw new NotEnoughCreditsError(t.cost, db.credits.free);
  }

  const msg: ChatMessage = { id: uid(), from: 'me', text, attachments: attachments.length ? attachments : undefined };
  commit((d) => {
    const th = thread(d, id);
    th.messages = th.messages.filter((m) => !m.failed);
    th.messages.push(msg);
    th.composer = '';
    th.typing = true;
  });

  await wait(AGENT_MS);
  if (failNextSend > 0) {
    failNextSend -= 1;
    commit((d) => {
      const th = thread(d, id);
      th.typing = false;
      const m = th.messages.find((x) => x.id === msg.id);
      if (m) m.failed = true;
    });
    throw new ChatOfflineError();
  }

  commit((d) => {
    const th = thread(d, id);
    th.typing = false;
    if (th.kind === 'change') agentChangeReply(d, th, text);
    else agentPageReply(th, text);
  });
}

function agentChangeReply(d: StudioData, th: Thread, text: string) {
  const short = text.length > 64 ? `${text.slice(0, 61)}…` : text;
  if (th.changes.length >= PRICES.maxChanges) {
    th.messages.push({ id: uid(), from: 'agent', text: `That's ${PRICES.maxChanges} changes, the most one request can hold. Check these first, then start a new chat for the rest.` });
    return;
  }
  th.changes.push({ where: 'To confirm with you', old: 'Current text', new: short });
  if (th.title === 'New change') th.title = short.length > 32 ? `${short.slice(0, 31)}…` : short;
  let setAsideNote = '';
  if (!th.setAside) {
    d.credits.free -= th.cost;
    d.credits.setAside += th.cost;
    ledger(d, { text: `#${th.id} Set aside · ${th.title}`, amount: th.cost, kind: 'held' });
    th.setAside = true;
    setAsideNote = ` ${th.cost} credits are set aside now and only charged when you approve.`;
  }
  th.messages.push({ id: uid(), from: 'agent', text: `Got it. I've added "${short}" to your changes.${setAsideNote} Anything else?` });
}

function agentPageReply(th: Thread, text: string) {
  if (th.plan && th.plan.length === 0) {
    th.plan = [
      { kind: 'Banner', title: text.length > 40 ? `${text.slice(0, 39)}…` : text },
      { kind: 'Text', title: 'About this page' },
      { kind: 'WhatsApp button', title: 'Ask on WhatsApp' },
    ];
    th.title = 'New page';
    th.messages.push({ id: uid(), from: 'agent', text: "Here's a first plan built from your site's blocks. Upload a layout sketch if you have one, or tell me what to add." });
    return;
  }
  th.messages.push({ id: uid(), from: 'agent', text: "Noted. I'll keep that in mind for the page. Anything else, or shall we look at a preview?" });
}

/** Uploads a layout sketch; agent-ba maps it to the site's blocks. */
export async function uploadSketch(id: number, file: Attachment) {
  commit((d) => {
    const th = thread(d, id);
    th.messages.push({ id: uid(), from: 'me', text: '', attachments: [file] });
    th.sketch = { name: file.name, url: file.url };
    th.typing = true;
  });
  await wait(AGENT_MS);
  commit((d) => {
    const th = thread(d, id);
    th.typing = false;
    th.plan = sketchPlan.map((b) => ({ ...b }));
    th.messages.push({ id: uid(), from: 'agent', blockMap: true, text: "Thanks. I've matched your sketch to your site's blocks. The page plan on the right now follows it." });
  });
}

export function addSection(id: number) {
  commit((d) => {
    const th = thread(d, id);
    const plan = th.plan ?? [];
    const firstUnmatched = plan.findIndex((b) => b.unmatched);
    const block: PageBlock = { kind: 'Text', title: 'New section · tell agent-ba what goes here' };
    if (firstUnmatched < 0) plan.push(block);
    else plan.splice(firstUnmatched, 0, block);
    th.plan = plan;
  });
}

/** Opens the next preview. The first 5 are free; after that each costs 10 credits. */
export async function openPreview(id: number) {
  await wait();
  commit((d) => {
    const th = thread(d, id);
    const used = th.previewsUsed ?? 0;
    if (used >= PRICES.freePreviews) spendFree(d, PRICES.extraPreview, `#${id} Extra preview · ${th.title}`);
    th.previewsUsed = used + 1;
  });
}

/** 13 Not enough credits → Wait: keep the draft and start it at the monthly reset. Nothing is charged. */
export async function scheduleDraft(id: number) {
  await wait();
  commit((d) => {
    const th = thread(d, id);
    d.requests = d.requests.filter((r) => r.id !== id);
    d.requests.push({
      id,
      type: th.kind,
      title: th.title,
      status: 'draft',
      currentStep: 0,
      note: `Starts ${shortDay(d.credits.resetDate)} when your monthly credits arrive · nothing charged`,
      credits: th.cost,
      changeCount: th.changes.length,
      scheduledFor: d.credits.resetDate,
    });
  });
}

// ---------- requests ----------

function request(d: StudioData, id: number): StudioRequest {
  const r = d.requests.find((x) => x.id === id);
  if (!r) throw new Error(`No request #${id}`);
  return r;
}

/** 09 Approve and publish: charges the set-aside credits and puts the change live. */
export async function approveChange(id: number, englishOnly: boolean) {
  await wait();
  commit((d) => {
    const r = request(d, id);
    const cost = r.credits ?? 0;
    d.credits.setAside = Math.max(0, d.credits.setAside - cost);
    d.credits.used += cost;
    d.ledger = d.ledger.filter((l) => !(l.kind === 'held' && l.text.startsWith(`#${id} `)));
    ledger(d, { text: `#${id} Change · ${r.shortTitle ?? r.title}`, amount: -cost, kind: 'spend' });
    r.status = 'live';
    r.currentStep = 3;
    r.note = `Live since ${formatShort(today())} · ${cost} credits${englishOnly ? ' · English only' : ''}`;
    if (englishOnly && r.changes) {
      r.changes = r.changes.map((c) => (c.kind === 'text' ? { ...c, rows: c.rows.filter((row) => row.lang !== 'Malay') } : c));
    }
    d.history.unshift({ id, type: 'change', title: r.title, date: todayIso(), scope: `${r.changeCount ?? 1} changes`, credits: cost, changes: r.changes ?? [] });
  });
}

/** 11 Approve and go live. */
export async function approvePreview(id: number) {
  await wait();
  commit((d) => {
    const r = request(d, id);
    r.status = 'live';
    r.currentStep = 4;
    r.deadline = undefined;
    r.note = `Live since ${formatShort(today())} · RM ${PRICES.newPageRm}`;
    d.history.unshift({ id, type: 'page', title: `New page: ${r.title}`, date: todayIso(), scope: `${r.blocks?.length ?? 0} sections`, credits: null, changes: [] });
  });
}

/** 11 Send changes: uses the free round first, then 10 credits per extra round. Back to Build. */
export async function requestPreviewChanges(id: number, feedback: string) {
  await wait();
  commit((d) => {
    const r = request(d, id);
    const used = r.roundsUsed ?? 0;
    if (used >= (r.freeRounds ?? 0)) spendFree(d, PRICES.extraRound, `#${id} Extra change round · ${r.title}`);
    r.roundsUsed = used + 1;
    r.status = 'building';
    r.currentStep = 1;
    r.deadline = undefined;
    const ready = formatShort(addDays(today(), 2));
    r.note = `Changes requested · new preview by ${ready}`;
    r.timeline = [
      ...(r.timeline ?? []).slice(0, 1),
      { when: `${formatShort(today())}–${ready}`, detail: `Your changes: "${feedback.length > 60 ? `${feedback.slice(0, 57)}…` : feedback}"` },
      { when: ready, detail: 'Automatic checks' },
      { when: formatShort(addDays(today(), 9)), estimate: true, detail: 'You check the new preview · 7 days to reply' },
      { when: 'after you approve', detail: 'Goes live after you approve' },
    ];
  });
}

/** 10 Confirm · RM 100: sends the invoice and moves the page to Building. */
export async function confirmSignOff(id: number) {
  await wait();
  commit((d) => {
    const th = thread(d, id);
    const blocks = (th.plan ?? []).filter((b) => !b.unmatched);
    const start = today();
    const ready = addWorkingDays(start, 3);
    d.requests = d.requests.filter((r) => r.id !== id);
    d.requests.push({
      id,
      type: 'page',
      title: th.title,
      status: 'building',
      currentStep: 1,
      note: `Ready by ${formatShort(ready)}`,
      credits: null,
      signedOff: toIsoDay(start),
      blocks,
      timeline: [
        { when: formatShort(start), detail: `Signed off ${formatShort(start)} · invoice sent` },
        { when: `${formatShort(start)}–${formatShort(ready)}`, detail: `Started ${formatShort(start)} · ready by ${formatShort(ready)}` },
        { when: formatShort(ready), detail: 'Automatic checks' },
        { when: formatShort(addDays(ready, 7)), estimate: true, detail: 'You check the preview · 7 days to reply' },
        { when: 'after you approve', detail: 'Goes live after you approve' },
      ],
    });
  });
}

// ---------- demo ----------

/** `?demo=low-credits`: 10 credits free, as on 13 Not enough credits. */
export function setLowCredits() {
  commit((d) => {
    d.credits = { ...d.credits, free: 10, setAside: 0, used: d.credits.monthly - 10 };
    d.ledger = d.ledger.filter((l) => l.kind !== 'held');
  });
}

export function resetDemo() {
  db = seedData();
  persist();
  listeners.forEach((l) => l());
}
