import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addSection, creditsShortFor, NotEnoughCreditsError, saveComposer, sendMessage, submitChanges, uploadSketch, openPreview } from '@/api/studio';
import { AppShell, Columns } from '@/components/Layout';
import { Button, ButtonLink } from '@/components/Button';
import { DraftTag, StatusBadge } from '@/components/Badge';
import { checkFiles, Composer, numberBlocks, Thread } from '@/components/Chat';
import { ChatOffline, EmptyState } from '@/components/States';
import { useToast } from '@/components/Toast';
import { PRICES } from '@/data/seed';
import type { Attachment, ChatMessage, RequestType, StudioRequest, Thread as ThreadData } from '@/data/types';
import { useStudio } from '@/state/studio';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import { useStartChat } from './ChatStart';
import s from './Chat.module.css';

const NEW: Record<string, RequestType> = { 'new-change': 'change', 'new-page': 'page' };

/** /chat/:id — 07 (text change) or 08 (new page), decided by the thread. `new-change` / `new-page` start one. */
export function ChatThread() {
  const { id: param = '' } = useParams();
  const { threads, requests } = useStudio();
  const newKind = NEW[param];

  if (newKind) return <NewThread kind={newKind} />;

  const thread = threads[Number(param)];
  if (!thread) {
    return (
      <AppShell>
        <Columns hero={null} aside={null}>
          <EmptyState title="We couldn't find that chat" body="Start a new one and agent-ba will pick it up from there." />
        </Columns>
      </AppShell>
    );
  }
  return <ThreadScreen thread={thread} request={requests.find((r) => r.id === thread.id)} />;
}

/** A fresh chat before its first message: nothing is created until you send. */
function NewThread({ kind }: { kind: RequestType }) {
  const [draft, setDraft] = useState('');
  const start = useStartChat();
  const virtual: ThreadData = {
    id: 0,
    kind,
    title: kind === 'page' ? 'New page' : 'New change',
    savedOn: '',
    composer: draft,
    cost: kind === 'change' ? PRICES.change : 0,
    setAside: false,
    changes: [],
    plan: kind === 'page' ? [] : undefined,
    previewsUsed: 0,
    messages: [{ id: 'hello', from: 'agent', text: kind === 'page' ? 'What should the new page be about?' : 'Hi Mei! What would you like to change?' }],
  };
  return (
    <Layout
      thread={virtual}
      composer={<Composer value={draft} onChange={setDraft} onSend={(text, files) => start(kind, text, files)} />}
      aside={kind === 'change' ? <ChangesPanel thread={virtual} /> : <PlanPanel thread={virtual} />}
    />
  );
}

function ThreadScreen({ thread, request }: { thread: ThreadData; request?: StudioRequest }) {
  const navigate = useNavigate();
  const toast = useToast();
  const lastMine = [...thread.messages].reverse().find((m) => m.from === 'me');
  const offline = lastMine?.failed ? lastMine : null;

  const send = (text: string, files: Attachment[]) => {
    if (creditsShortFor(thread.id) > 0) {
      saveComposer(thread.id, text);
      navigate(routes.noCredits(thread.id));
      return;
    }
    sendMessage(thread.id, text, files).catch((e) => {
      if (e instanceof NotEnoughCreditsError) navigate(routes.noCredits(thread.id));
    });
  };

  const retry = (m: ChatMessage) => {
    sendMessage(thread.id, m.text, m.attachments).catch(() => toast("Still can't reach agent-ba. Your message is saved.", 'error'));
  };

  const onSketch = (file: File) => {
    const { ok, error } = checkFiles([file], 0);
    if (error || !ok[0]) return toast(error ?? 'Could not add that file.', 'error');
    uploadSketch(thread.id, ok[0]).catch(() => toast("Couldn't upload the sketch. Try again.", 'error'));
  };

  return (
    <Layout
      thread={thread}
      request={request}
      after={offline ? <ChatOffline onRetry={() => retry(offline)} retrying={thread.typing} /> : null}
      composer={
        <Composer
          value={thread.composer}
          onChange={(v) => saveComposer(thread.id, v)}
          onSend={send}
          sending={thread.typing}
          extra={thread.kind === 'page' ? <SketchButton onPick={onSketch} disabled={thread.typing} /> : undefined}
          hint={thread.kind === 'page' ? 'Screenshots or a hand-drawn sketch: up to 5, 5 MB each.' : undefined}
        />
      }
      aside={thread.kind === 'change' ? <ChangesPanel thread={thread} request={request} /> : <PlanPanel thread={thread} request={request} />}
    />
  );
}

function Layout({ thread, request, composer, aside, after }: { thread: ThreadData; request?: StudioRequest; composer: React.ReactNode; aside: React.ReactNode; after?: React.ReactNode }) {
  const hero = (
    <>
      <span className={t.label}>agent-ba</span>
      <span className={s.heroMeta}>
        {thread.id ? `#${thread.id} · ` : ''}
        {thread.kind === 'page' ? `New page${thread.title !== 'New page' ? ` · ${thread.title}` : ''}` : thread.title}
      </span>
      {request ? <StatusBadge request={request} /> : <DraftTag />}
    </>
  );
  return (
    <AppShell bottomBar={composer} bottomHeight={120}>
      <Columns hero={hero} heroClassName={cx(s.hero, s.threadHero)} mainClassName={s.threadMain} aside={aside} asideWidth={400} asideCard asideClassName={s.aside}>
        <Thread messages={thread.messages} typing={thread.typing} plan={thread.plan} after={after} />
      </Columns>
    </AppShell>
  );
}

function SketchButton({ onPick, disabled }: { onPick: (f: File) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant="secondary" size="md" style={{ fontSize: 14, padding: '0 16px' }} disabled={disabled} onClick={() => ref.current?.click()}>
        Upload a layout sketch
      </Button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        data-testid="sketch"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    </>
  );
}

/** 07: what agent-ba has listed so far, updating live, with the credits set aside before anything starts. */
function ChangesPanel({ thread, request }: { thread: ThreadData; request?: StudioRequest }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const done = async () => {
    setBusy(true);
    await submitChanges(thread.id);
    toast(`Sent to Chi. You'll get the before and after to check.`);
    navigate(routes.requests);
  };

  return (
    <>
      <div className={s.panelHead}>
        <h2 className={s.h2}>Your changes</h2>
        <span className={s.count}>
          {thread.changes.length} of {PRICES.maxChanges}
        </span>
      </div>
      <ol className={s.changes} aria-live="polite" aria-label="Changes listed so far">
        {thread.changes.map((c, i) => (
          <li key={i} className={s.changeItem}>
            <strong>
              {i + 1}. {c.where}
            </strong>
            <s>
              <span className="visually-hidden">Was: </span>
              {c.old}
            </s>
            <span>
              <span className="visually-hidden">Becomes: </span>→ {c.new}
            </span>
          </li>
        ))}
      </ol>
      {thread.changes.length === 0 && <p className={s.emptyNote}>Changes you ask for appear here as agent-ba lists them.</p>}
      <div className={s.held}>
        <strong>{thread.setAside ? `${thread.cost} credits set aside` : `${thread.cost} credits for this change`}</strong>
        <span>{thread.setAside ? 'Charged only when you approve.' : 'Set aside when you send. Charged only when you approve.'}</span>
      </div>
      {request?.status === 'uat' ? (
        <ButtonLink to={routes.review(thread.id)} size="lg" block>
          Check before and after
        </ButtonLink>
      ) : request && request.status !== 'draft' && request.status !== 'paused' ? (
        <ButtonLink to={routes.progress(thread.id)} variant="secondary" block>
          See progress
        </ButtonLink>
      ) : thread.changes.length > 0 && thread.setAside ? (
        <Button size="lg" block loading={busy} loadingLabel="Sending…" onClick={done}>
          Done adding changes
        </Button>
      ) : null}
    </>
  );
}

/** 08: the page plan, numbered to match the sketch map. Unmatched blocks are red and outside the RM 100. */
function PlanPanel({ thread, request }: { thread: ThreadData; request?: StudioRequest }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const plan = numberBlocks(thread.plan ?? []);
  const unmatched = plan.filter((b) => b.unmatched);
  const used = thread.previewsUsed ?? 0;
  const nextIsFree = used < PRICES.freePreviews;

  const preview = async () => {
    setBusy(true);
    try {
      await openPreview(thread.id);
      toast(nextIsFree ? `Preview ${used + 1} of ${PRICES.freePreviews} is on its way. We'll message you.` : `Extra preview on its way. ${PRICES.extraPreview} credits charged.`);
    } catch (e) {
      toast(e instanceof NotEnoughCreditsError ? `An extra preview needs ${PRICES.extraPreview} credits. Top up on Credits.` : "Couldn't start the preview. Try again.", 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span className={t.label}>Page plan</span>
      <h2 className={s.h2}>{thread.title}</h2>
      {thread.sketch && <span className={s.small}>Based on your sketch</span>}
      <ol className={s.changes} aria-label="Page sections">
        {plan.map((b, i) => (
          <li key={i} className={cx(s.planRow, b.unmatched && s.planUnmatched)}>
            <span>{b.n}</span>
            <span>
              <strong>{b.kind}</strong>
              <small>{b.unmatched ? `${b.title} · needs a quote from Chi` : b.title}</small>
            </span>
          </li>
        ))}
      </ol>
      {plan.length === 0 && <p className={s.emptyNote}>Tell agent-ba what the page is for, or upload a layout sketch.</p>}
      {thread.id > 0 && !request && (
        <button type="button" className={s.addSection} onClick={() => addSection(thread.id)}>
          + Add a section
        </button>
      )}
      <div className={s.priceRow}>
        <span>English only · existing images</span>
        <strong>RM {PRICES.newPageRm}</strong>
      </div>
      {unmatched.length > 0 && <p className={s.quote}>{unmatched.map((b) => b.kind).join(', ')}: not in the RM {PRICES.newPageRm}. Chi will quote separately.</p>}
      {request ? (
        <ButtonLink to={routes.progress(thread.id)} variant="secondary" block>
          See progress
        </ButtonLink>
      ) : (
        <>
          <Button variant="secondary" size="sm" block disabled={plan.length === 0} loading={busy} loadingLabel="Preparing…" onClick={preview}>
            {nextIsFree ? `See preview · ${used} of ${PRICES.freePreviews}` : `See preview · ${PRICES.extraPreview} credits`}
          </Button>
          {plan.length > 0 && thread.id > 0 ? (
            <ButtonLink to={routes.signOff(thread.id)} block>
              Review and sign off
            </ButtonLink>
          ) : (
            <Button block disabled>
              Review and sign off
            </Button>
          )}
          <span className={s.small}>
            {PRICES.freePreviews} previews included. More are {PRICES.extraPreview} credits each.
          </span>
        </>
      )}
    </>
  );
}
