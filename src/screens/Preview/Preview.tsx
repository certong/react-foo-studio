import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { approvePreview, NotEnoughCreditsError, requestPreviewChanges } from '@/api/studio';
import { AppShell, Columns, HeroNumber } from '@/components/Layout';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/States';
import { useToast } from '@/components/Toast';
import { PRICES, session } from '@/data/seed';
import { useStudio } from '@/state/studio';
import { deadlineFor, typeLabel } from '@/lib/requests';
import { routes } from '@/routes';
import s from './Preview.module.css';

/** 11: the staged page is the focus. Approve, or send one round of changes (then 10 credits a round). */
export function Preview() {
  const { id = '' } = useParams();
  const { requests, credits } = useStudio();
  const navigate = useNavigate();
  const toast = useToast();
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState<'approve' | 'changes' | null>(null);
  const r = requests.find((x) => x.id === id);

  if (!r || r.status !== 'uat' || r.type !== 'new_page' || !r.previewUrl) {
    return (
      <AppShell>
        <Columns hero={<HeroNumber value="—" />} aside={null}>
          <EmptyState
            title="This preview isn't waiting on you"
            body={r ? `#${r.number} ${r.title} is ${r.status === 'live' ? 'already live' : 'being worked on'}. Its progress shows every step.` : 'We couldn\'t find that preview.'}
            action={r ? { label: 'See progress', to: routes.progress(r.id) } : { label: 'Go to Requests', to: routes.requests }}
          />
        </Columns>
      </AppShell>
    );
  }

  const deadline = deadlineFor(r);
  const freeLeft = Math.max(0, (r.freeRounds ?? 0) - (r.roundsUsed ?? 0));
  const roundLabel = freeLeft > 0 ? `Send changes · ${freeLeft} free round${freeLeft === 1 ? '' : 's'} left` : `Send changes · ${PRICES.extraRound} credits`;
  const stagingPath = `${session.site}${r.previewUrl.replace('/staging', '').replace('.html', '')}`;

  const approve = async () => {
    setBusy('approve');
    await approvePreview(id);
    toast(`${r.title} is live on ${session.site}.`);
    navigate(routes.requests);
  };

  const sendChanges = async () => {
    setBusy('changes');
    try {
      await requestPreviewChanges(id, feedback.trim());
      toast(freeLeft > 0 ? 'Changes sent. A new preview is on its way.' : `Changes sent. ${PRICES.extraRound} credits charged.`);
      navigate(routes.progress(id));
    } catch (e) {
      setBusy(null);
      toast(e instanceof NotEnoughCreditsError ? `Another round needs ${PRICES.extraRound} credits. You have ${credits.free}.` : "Couldn't send your changes. Try again.", 'error');
    }
  };

  const aside = (
    <>
      <h2 className={s.h2}>Happy with it?</h2>
      <p className={s.body}>The page is not live yet. It goes live only when you approve.</p>
      <Button size="lg" block loading={busy === 'approve'} loadingLabel="Publishing…" disabled={busy !== null} onClick={approve}>
        Approve and go live
      </Button>
      <label className={s.feedback}>
        Ask for changes
        <textarea className={s.textarea} rows={4} placeholder="What should change?" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <span className={s.rounds}>
          {freeLeft > 0
            ? `${r.freeRounds} free change round included. After that, ${PRICES.extraRound} credits a round.`
            : `Free round used. Each extra round is ${PRICES.extraRound} credits.`}
        </span>
      </label>
      <Button variant="secondary" block disabled={!feedback.trim() || busy !== null} loading={busy === 'changes'} loadingLabel="Sending…" onClick={sendChanges}>
        {roundLabel}
      </Button>
      {deadline && (
        <p className={s.close}>
          No reply by {deadline.label}: the page closes without going live, and Chi will check in with you.
        </p>
      )}
    </>
  );

  return (
    <AppShell>
      <Columns
        hero={<HeroNumber value={deadline?.daysLeft ?? 0} caption={deadline ? `days left to reply, by ${deadline.label}` : 'no deadline'} />}
        aside={aside}
        asideWidth={400}
        asideCard
        asideClassName={s.aside}
        mainClassName={s.main}
      >
        <div className={s.intro}>
          <span className={s.meta}>
            #{r.number} · {typeLabel(r)}
          </span>
          <h1 className={s.h1}>{r.title} preview</h1>
        </div>
        <div className={s.frame}>
          <div className={s.frameBar}>
            <strong>Preview</strong>
            <span>{stagingPath}</span>
            <span>Only you can see this</span>
          </div>
          <iframe className={s.iframe} src={r.previewUrl} title={`Staging preview of ${r.title}`} sandbox="allow-popups allow-popups-to-escape-sandbox" />
        </div>
      </Columns>
    </AppShell>
  );
}

