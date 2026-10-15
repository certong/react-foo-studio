import { Link, useSearchParams } from 'react-router-dom';
import { AppShell, ChatPromptBar, Columns, HeroNumber } from '@/components/Layout';
import { ButtonLink } from '@/components/Button';
import { StatusBadge } from '@/components/Badge';
import { SegmentedSwitch } from '@/components/SegmentedSwitch';
import { StepTracker } from '@/components/StepTracker';
import { EmptyState } from '@/components/States';
import type { StudioRequest } from '@/data/types';
import { useStudio } from '@/state/studio';
import { actionLabel, byFocus, isOpen, isYourTurn, requestHref, typeLabel } from '@/lib/requests';
import { statusInfo } from '@/lib/status';
import { stepsFor } from '@/lib/steps';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './Requests.module.css';

type Tab = 'active' | 'live' | 'all';

const TABS: Record<Tab, { label: string; caption: string; filter: (r: StudioRequest) => boolean; empty: { title: string; body: string } }> = {
  active: {
    label: 'Active',
    caption: 'active requests',
    filter: isOpen,
    empty: { title: 'Nothing in progress', body: 'When you ask agent-ba for something, it shows up here until it goes live.' },
  },
  live: {
    label: 'Live',
    caption: 'live',
    filter: (r) => r.status === 'live',
    empty: { title: 'Nothing live yet', body: 'Changes and pages appear here once you approve them and they go live.' },
  },
  all: {
    label: 'All',
    caption: 'requests in total',
    filter: () => true,
    empty: { title: 'No requests yet', body: 'When you ask agent-ba for something, it shows up here.' },
  },
};

const isTab = (v: string | null): v is Tab => v === 'active' || v === 'live' || v === 'all';

export function Requests() {
  const { requests, history } = useStudio();
  const [params, setParams] = useSearchParams();
  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'active';
  const all = params.get('demo') === 'empty' ? [] : requests;

  // Open items in focus order (your turn first), then the rest newest first.
  const ordered = [...byFocus(all), ...all.filter((r) => !isOpen(r)).sort((a, b) => b.id - a.id)];
  const shown = ordered.filter(TABS[tab].filter);
  const count = (k: Tab) => all.filter(TABS[k].filter).length;

  const aside = (
    <>
      <span className={t.label}>How a request moves</span>
      <p className={s.asideText}>Changes go Plan, Check, Ready to Check, Live. New pages add a Build step. Yellow is your turn; red means Chi is fixing something.</p>
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
      <Columns hero={<HeroNumber value={shown.length} caption={TABS[tab].caption} />} aside={aside}>
        <div className={s.header}>
          <h1 className={s.h1}>Requests</h1>
          <SegmentedSwitch
            label="Show requests"
            value={tab}
            onChange={(k) => setParams(k === 'active' ? {} : { tab: k }, { replace: true })}
            options={(Object.keys(TABS) as Tab[]).map((k) => ({ key: k, label: TABS[k].label, count: count(k) }))}
          />
        </div>

        {shown.length === 0 ? (
          <div className={cx(t.ruleTop, s.empty)}>
            <EmptyState plain number={tab === 'all' ? '00' : undefined} {...TABS[tab].empty} action={tab === 'live' ? null : undefined} />
          </div>
        ) : (
          <ul className={s.list} aria-label={`${TABS[tab].label} requests`}>
            {shown.map((r) => (
              <RequestRow key={r.id} r={r} />
            ))}
          </ul>
        )}
      </Columns>
    </AppShell>
  );
}

function RequestRow({ r }: { r: StudioRequest }) {
  const problem = statusInfo(r).tone === 'prob';
  return (
    <li className={s.row}>
      <div className={s.body}>
        <div className={s.meta}>
          <span>
            #{r.id} · {typeLabel(r)}
          </span>
          <StatusBadge request={r} />
        </div>
        <h2 className={s.title}>{r.title}</h2>
        <span className={cx(s.note, problem && s.noteProblem)}>{r.note}</span>
        <StepTracker steps={stepsFor(r)} />
      </div>
      <ButtonLink to={requestHref(r)} variant={isYourTurn(r) ? 'primary' : 'secondary'} aria-label={`${actionLabel(r)}: ${r.title}`}>
        {actionLabel(r)}
      </ButtonLink>
    </li>
  );
}
