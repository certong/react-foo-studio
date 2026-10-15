export type RequestType = 'change' | 'page';

export type RequestStatus =
  | 'draft'
  | 'in_progress'
  | 'building'
  | 'approve'
  | 'preview'
  | 'with_chi'
  | 'live'
  | 'closed'
  | 'dropped';

export type StepState = 'done' | 'now' | 'turn' | 'fail' | 'todo';

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

export interface StudioRequest {
  id: number;
  type: RequestType;
  title: string;
  /** Used in "Skip to …" links. */
  shortTitle?: string;
  status: RequestStatus;
  /** Index into the step list for this request type. */
  currentStep: number;
  note: string;
  /** Reply-by date (YYYY-MM-DD) for your-turn items. */
  deadline?: string;
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

export interface StudioData {
  credits: Credits;
  ledger: LedgerEntry[];
  requests: StudioRequest[];
  history: PastRequest[];
  threads: Record<number, Thread>;
}
