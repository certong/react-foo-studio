import type { components } from '@/api/schema';

/*
 * Contract types, generated from nest-foo-studio's openapi.json (FS-85). Never hand-write these:
 * change the contract in nest-foo-studio and run `npm run api:types`.
 */
type Schemas = components['schemas'];

export type RequestType = Schemas['RequestType'];
export type RequestStatus = Schemas['RequestStatus'];
export type CloseReason = Schemas['CloseReason'];
export type StatusKey = Schemas['StatusKey'];
export type Owner = Schemas['Owner'];
export type StepKey = Schemas['StepKey'];
export type StepState = Schemas['StepState'];
export type Step = Schemas['Step'];
export type RequestCard = Schemas['RequestCard'];
export type RequestDetail = Schemas['RequestDetail'];
export type MeResponse = Schemas['MeResponse'];
export type CreditsBlock = Schemas['CreditsBlock'];
export type LedgerKind = Schemas['LedgerKind'];
export type Topup = Schemas['Topup'];
export type TopupStatus = Schemas['TopupStatus'];
/** A chat message as the API sends it. The mock thread below still uses its own shape. */
export type ApiChatMessage = Schemas['ChatMessage'];
export type ChatPanel = Schemas['ChatPanel'];

/** A status on the normal path; on-hold and closed requests remember which of these they stopped at. */
export type ActiveStatus = Exclude<RequestStatus, 'pending_chi' | 'closed'>;

/** One step on the dated progress timeline (12 Request progress). */
export interface TimelineStep {
  /** "13 Oct", "13–16 Oct", "after you approve". */
  when: string;
  /** Estimates render as "by 23 Oct". */
  estimate?: boolean;
  detail: string;
}

export type ReviewChange =
  | {
      kind: 'text';
      where: string;
      rows: Array<{ lang: 'English' | 'Malay' | 'Link'; now: string; after: string }>;
    }
  | {
      kind: 'visual';
      where: string;
      now: string;
      after: string;
    };

export interface PageBlock {
  kind: string;
  title: string;
  words?: string;
  /** Not one of the site's blocks: needs a quote from Chi, not in the RM 100. */
  unmatched?: boolean;
}

/**
 * Fields the mock keeps on a request for screens that aren't on the API yet. Each moves to the
 * matching contract response (RequestDetail, ReviewResponse, PreviewResponse…) when its screen does.
 */
export interface RequestExtras {
  /** Used in "Skip to …" links. */
  shortTitle?: string;
  note: string;
  /** Number of edits in a text change. */
  changeCount?: number;
  /** Credits for a change, or null for a new page (RM 100, invoiced). */
  credits: number | null;
  timeline?: TimelineStep[];
  /** Blocks signed off for a new page. */
  blocks?: PageBlock[];
  signedOff?: string;
  /** Before/after for a change. */
  changes?: ReviewChange[];
  /** Staging URL for a preview review. */
  previewUrl?: string;
  freeRounds?: number;
  roundsUsed?: number;
  /** Chi's note when a check failed. */
  chiNote?: string;
  /** Draft kept until the monthly reset (13 Not enough credits → Wait). */
  scheduledFor?: string;
}

/** What the mock stores: the database view of a request, before the status is mapped. */
export interface RequestRow extends RequestExtras {
  id: number;
  type: RequestType;
  title: string;
  status: RequestStatus;
  closeReason: CloseReason | null;
  /** On hold or closed: the status it stopped at, so the tracker stops on that step. */
  stoppedAt?: ActiveStatus | null;
  /** Reply-by date (YYYY-MM-DD) while it's the client's turn. */
  replyBy: string | null;
  creditsHeld: number;
  updatedAt: string;
}

/** What screens see: a contract RequestCard (statusKey, badge, owner, steps[]) plus the mock's extras. */
export type StudioRequest = RequestCard & RequestExtras;

export interface PastRequest {
  id: number;
  type: RequestType;
  title: string;
  /** YYYY-MM-DD it went live. */
  date: string;
  scope: string;
  credits: number | null;
  changes: ReviewChange[];
}

export interface Session {
  name: string;
  fullName: string;
  initials: string;
  email: string;
  business: string;
  site: string;
}

export interface Credits {
  monthly: number;
  free: number;
  setAside: number;
  used: number;
  topUp: number;
  /** YYYY-MM-DD of the next monthly reset. */
  resetDate: string;
  topUpRequest: 'none' | 'waiting';
}

export interface LedgerEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  text: string;
  /** Positive = added, negative = spent. Held entries carry the held amount. */
  amount: number;
  kind: 'add' | 'spend' | 'held';
}

export interface Attachment {
  name: string;
  size: number;
  /** Object URL for images picked this session. Not persisted. */
  url?: string;
}

export interface ChatMessage {
  id: string;
  from: 'agent' | 'me';
  text: string;
  attachments?: Attachment[];
  /** Agent reply that maps the uploaded sketch to the site's blocks. */
  blockMap?: boolean;
  /** Message that failed to send (chat offline). */
  failed?: boolean;
}

export interface PlannedChange {
  where: string;
  old: string;
  new: string;
}

export interface Thread {
  id: number;
  kind: RequestType;
  title: string;
  messages: ChatMessage[];
  /** Composer text kept between visits. */
  composer: string;
  /** Text change: what the agent has listed so far. */
  changes: PlannedChange[];
  /** Credits this change needs; set aside once the first change is listed. */
  cost: number;
  setAside: boolean;
  /** New page: plan built from the conversation (and sketch, once uploaded). */
  plan?: PageBlock[];
  sketch?: { name: string; url?: string };
  previewsUsed?: number;
  /** agent-ba is replying. Not persisted. */
  typing?: boolean;
  savedOn: string;
  summary?: string;
}

/** What the mock persists. */
export interface MockData {
  credits: Credits;
  ledger: LedgerEntry[];
  requests: RequestRow[];
  history: PastRequest[];
  threads: Record<number, Thread>;
}

/** What screens read: the same data, with every request mapped to the contract shape. */
export interface StudioData extends Omit<MockData, 'requests'> {
  requests: StudioRequest[];
}
