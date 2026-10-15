import { useState } from 'react';
import { TopBar, type NavKey } from '@/components/TopBar';
import { Button, ButtonLink } from '@/components/Button';
import { Badge, DraftTag, StatusBadge } from '@/components/Badge';
import { StepTracker } from '@/components/StepTracker';
import { SegmentedSwitch } from '@/components/SegmentedSwitch';
import { ChatPromptBar, HeroNumber } from '@/components/Layout';
import { useStudio } from '@/state/studio';
import type { ActiveStatus, CloseReason, RequestStatus } from '@/data/types';
import { mapStatus } from '@/api/mock/status';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './Kit.module.css';

// Every badge, as the API would send it (the mock's copy of mapStatus).
const STATUSES = (
  [
    { status: 'draft' }, { status: 'building' }, { status: 'checking' }, { status: 'uat' },
    { status: 'pending_chi', stoppedAt: 'checking' }, { status: 'live' },
    { status: 'closed', closeReason: 'client_cancelled', stoppedAt: 'draft' },
    { status: 'closed', closeReason: 'no_reply', stoppedAt: 'uat' },
    { status: 'closed', closeReason: 'agent_closed', stoppedAt: 'building' },
  ] as Array<{ status: RequestStatus; closeReason?: CloseReason; stoppedAt?: ActiveStatus }>
).map((x) => mapStatus({ type: 'change', closeReason: null, ...x }));
const NAV: NavKey[] = ['home', 'requests', 'credits', 'chat'];

/** FS-69 component sheet: every shared piece in each of its states. */
export function Kit() {
  const { requests } = useStudio();
  const [tab, setTab] = useState<'active' | 'live' | 'all'>('active');
  const [lang, setLang] = useState<'both' | 'en'>('both');
  const [checked, setChecked] = useState(false);

  return (
    <div className={s.page}>
      <header className={s.header}>
        <span className={t.label}>FS-69 · Shared pieces</span>
        <h1 className={t.h1}>Component sheet</h1>
        <p className={t.lead}>The top bar, buttons, badges, the step tracker, the segmented switch and the layout parts, in each state.</p>
      </header>

      <section className={s.section}>
        <h2 className={t.label}>Top bar · active item and credit meter</h2>
        {NAV.map((key) => (
          <div key={key} className={s.frame}>
            <TopBar active={key} />
          </div>
        ))}
        <span className={t.meta}>Low credits (13 Not enough credits): 10 free, nothing set aside</span>
        <div className={s.frame}>
          <TopBar active="credits" credits={{ free: 10, setAside: 0, topUp: 0 }} />
        </div>
      </section>

      <section className={s.section}>
        <h2 className={t.label}>Buttons · hover shows the arrow</h2>
        <div className={s.row}>
          <Button size="hero">Review preview</Button>
          <Button size="lg">Approve and publish</Button>
          <Button>Check before and after</Button>
          <Button size="sm">Request 100 credits</Button>
          <Button size="xs" variant="secondary">See changes</Button>
        </div>
        <div className={s.row}>
          <Button variant="secondary">Try again</Button>
          <Button size="lg" disabled>Confirm · RM 100</Button>
          <Button loading>Send</Button>
          <ButtonLink to={routes.chatStart}>Start a chat (link)</ButtonLink>
        </div>
        <div className={s.row}>
          <Button variant="secondary" aria-pressed={lang === 'both'} onClick={() => setLang('both')}>
            Update Malay too
          </Button>
          <Button variant="secondary" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English only
          </Button>
          <label className={s.row}>
            <input type="checkbox" checked={checked} onChange={() => setChecked(!checked)} style={{ width: 22, height: 22, accentColor: 'var(--ink)' }} />
            I've checked the text
          </label>
          <Button size="lg" disabled={!checked}>Approve and publish</Button>
        </div>
      </section>

      <section className={s.section}>
        <h2 className={t.label}>Badges</h2>
        <div className={s.row}>
          {STATUSES.map((st) => (
            <StatusBadge key={st.statusKey} request={st} />
          ))}
          <DraftTag />
          <Badge tone="turn">Waiting for payment</Badge>
          <Badge tone="prob" size="lg">! Not enough credits</Badge>
          <Badge tone="info">Most asked</Badge>
        </div>
      </section>

      <section className={s.section}>
        <h2 className={t.label}>Step tracker · Timeline</h2>
        <div className={s.grid}>
          {requests.map((r) => (
            <div key={r.id} className={s.tracker}>
              <span className={s.row}>
                <span className={t.meta}>#{r.id} · {r.type === 'new_page' ? 'New page' : 'Change'}</span>
                <StatusBadge request={r} />
              </span>
              <strong className={t.title}>{r.title}</strong>
              <StepTracker steps={r.steps} />
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={t.label}>Segmented switch · arrow keys move between tabs</h2>
        <div className={s.row}>
          <SegmentedSwitch
            label="Filter requests"
            value={tab}
            onChange={setTab}
            options={[
              { key: 'active', label: 'Active', count: 4 },
              { key: 'live', label: 'Live', count: 1 },
              { key: 'all', label: 'All', count: 5 },
            ]}
          />
          <span className={t.meta}>Selected: {tab}</span>
        </div>
      </section>

      <section className={s.section}>
        <h2 className={t.label}>Layout parts</h2>
        <div className={s.hero}>
          <HeroNumber value={4} caption="active requests" />
        </div>
        <div className={s.frame} style={{ height: 104, display: 'grid' }}>
          <ChatPromptBar />
        </div>
      </section>
    </div>
  );
}
