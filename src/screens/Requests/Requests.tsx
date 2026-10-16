import { Link, useSearchParams } from 'react-router-dom';
import { AppShell, ChatPromptBar, Columns, HeroNumber } from '@/components/Layout';
import { ButtonLink } from '@/components/Button';
import { StatusBadge } from '@/components/Badge';
import { SegmentedSwitch } from '@/components/SegmentedSwitch';
import { StepTracker } from '@/components/StepTracker';
import { EmptyState, LoadFailed } from '@/components/States';
import type { RequestListItem, RequestTab } from '@/data/types';
import { useRequests } from '@/state/requests';
import { useStudio } from '@/state/studio';
import { actionLabel, isProblem, isYourTurn, requestHref, typeLabel } from '@/lib/requests';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './Requests.module.css';

const TABS: Record<RequestTab, { label: string; caption: string; empty: { title: string; body: string } }> = {
  active: {
    label: 'Active',
    caption: 'active requests',
    empty: { title: 'Nothing in progress', body: 'When you ask agent-ba for something, it shows up here until it goes live.' },
  },
  live: {
    label: 'Live',
    caption: 'live',
    empty: { title: 'Nothing live yet', body: 'Changes and pages appear here once you approve them and they go live.' },
  },
  all: {
    label: 'All',
    caption: 'requests in total',
    empty: { title: 'No requests yet', body: 'When you ask agent-ba for something, it shows up here.' },
  },
};
const TAB_KEYS = Object.keys(TABS) as RequestTab[];
const isTab = (v: string | null): v is RequestTab => v === 'active' || v === 'live' || v === 'all';
const NO_COUNTS = { active: 0, live: 0, all: 0 };

/** 04 Requests (FS-73): one tab of GET /portal/requests, sorted by the API (your turn first). */
export function Requests() {
  const [params, setParams] = useSearchParams();
  const tab: RequestTab = isTab(params.get('tab')) ? (params.get('tab') as RequestTab) : 'active';
  const page = useRequests(tab);
  const { history } = useStudio();
  const demoEmpty = params.get('demo') === 'empty';
  const shown = demoEmpty ? [] : page.items;
  const counts = demoEmpty ? NO_COUNTS : page.counts;
  const showLoading = page.loading && shown.length === 0 && !page.error;

  const aside = (
    <>
      <span className={t.label}>How a request moves</span>
      <p className={s.asideText}>Changes go Plan, Check, Ready to Check, Live. New pages add a Build step. Yellow is your turn; red means On Hold while Chi fixes something.</p>
      <ButtonLink to={routes.chatStart} block className={s.asideCta}>
        New request
      </ButtonLink>
      <Link to={routes.history} className={s.pastLink}>
        Past requests<span>{history.length} →</span>
      </Link>
    </>
  );

  return (
    <AppShell bottomBar={<ChatPromptBar />}>
      <Columns hero={<HeroNumber value={showLoading || page.error ? '—' : shown.length} caption={TABS[tab].caption} />} aside={aside}>
        <div className={s.header}>
          <h1 className={s.h1}>Requests</h1>
          <SegmentedSwitch
            label="Show requests"
            value={tab}
            onChange={(k) => setParams(k === 'active' ? {} : { tab: k }, { replace: true })}
            options={TAB_KEYS.map((k) => ({ key: k, label: TABS[k].label, count: counts[k] }))}
          />
        </div>

        {page.error ? (
          <div className={cx(t.ruleTop, s.empty)}>
            <LoadFailed plain what="requests" onRetry={page.reload} retrying={page.loading} />
          </div>
        ) : showLoading ? (
          <p className={cx(t.ruleTop, s.empty, s.loading)} role="status">
            Loading your requests…
          </p>
        ) : shown.length === 0 ? (
          <div className={cx(t.ruleTop, s.empty)}>
            <EmptyState plain number={tab === 'all' ? '00' : undefined} {...TABS[tab].empty} action={tab === 'live' ? null : undefined} />
          </div>
        ) : (
          <ul className={s.list} aria-label={`${TABS[tab].label} requests`} aria-busy={page.loading || undefined}>
            {shown.map((r) => (
              <RequestRow key={r.id} r={r} />
            ))}
          </ul>
        )}
      </Columns>
    </AppShell>
  );
}

function RequestRow({ r }: { r: RequestListItem }) {
  const problem = isProblem(r);
  return (
    <li className={s.row}>
      <div className={s.body}>
        <div className={s.meta}>
          <span>
            #{r.number} · {typeLabel(r)}
          </span>
          <StatusBadge request={r} />
        </div>
        <h2 className={s.title}>{r.title}</h2>
        {r.note && <span className={cx(s.note, problem && s.noteProblem)}>{r.note}</span>}
        <StepTracker steps={r.steps} />
      </div>
      <ButtonLink to={requestHref(r)} variant={isYourTurn(r) ? 'primary' : 'secondary'} aria-label={`${actionLabel(r)}: ${r.title}`}>
        {actionLabel(r)}
      </ButtonLink>
    </li>
  );
}
