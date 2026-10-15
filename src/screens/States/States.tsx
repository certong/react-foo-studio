import { AppShell } from '@/components/Layout';
import { CheckFailed, ChatOffline, EmptyState } from '@/components/States';
import { useToast } from '@/components/Toast';
import { useStudio } from '@/state/studio';
import s from './States.module.css';

/** 14: the empty and error states side by side (in the app they appear in context). */
export function States() {
  const { requests } = useStudio();
  const toast = useToast();
  const failed = requests.find((r) => r.status === 'pending_chi');

  return (
    <AppShell>
      <main className={s.main} style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <h1 className={s.h1}>Empty and error states</h1>
        <div className={s.grid}>
          <EmptyState number="00" title="No requests yet" body="When you ask agent-ba for something, it shows up here." />
          <ChatOffline onRetry={() => toast('This is the sample state. In a chat, Try again re-sends your saved message.')} />
          {failed ? (
            <CheckFailed request={failed} />
          ) : (
            <EmptyState title="No failed checks" body="Nothing is with Chi right now." action={null} />
          )}
        </div>
      </main>
    </AppShell>
  );
}
