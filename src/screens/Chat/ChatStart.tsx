import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { creditsShortFor, saveComposer, sendMessage, startThread } from '@/api/studio';
import { AppShell, Columns } from '@/components/Layout';
import { Badge } from '@/components/Badge';
import { Composer, type ComposerHandle } from '@/components/Chat';
import { PRICES, session } from '@/data/seed';
import type { Attachment, RequestType } from '@/data/types';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './Chat.module.css';

const IDEAS = ['Change opening hours', 'Update a menu price', 'Fix the WhatsApp link', 'Add a video'];

/** Starts a chat and sends the first message. A change without enough credits goes to 13, draft kept. */
export function useStartChat() {
  const navigate = useNavigate();
  return (kind: RequestType, text: string, attachments: Attachment[] = []) => {
    const id = startThread(kind);
    if (creditsShortFor(id) > 0) {
      saveComposer(id, text);
      navigate(routes.noCredits(id));
      return;
    }
    // Errors (chat offline) show up in the thread itself.
    sendMessage(id, text, attachments).catch(() => {});
    navigate(routes.thread(id));
  };
}

export function ChatStart() {
  const [draft, setDraft] = useState('');
  const composer = useRef<ComposerHandle>(null);
  const start = useStartChat();

  const hero = (
    <>
      <span className={t.label}>agent-ba</span>
      <span className={s.heroMeta}>Your Studio assistant</span>
    </>
  );

  const aside = (
    <>
      <span className={t.label}>Quick ideas</span>
      <ul className={s.ideas}>
        {IDEAS.map((idea) => (
          <li key={idea}>
            <button
              type="button"
              className={s.idea}
              onClick={() => {
                setDraft(idea);
                composer.current?.focus();
              }}
            >
              {idea}
              <span aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <AppShell
      bottomHeight={120}
      bottomBar={<Composer ref={composer} value={draft} onChange={setDraft} onSend={(text, files) => start('change', text, files)} />}
    >
      <Columns hero={hero} heroClassName={s.hero} aside={aside} mainClassName={s.startMain}>
        <h1 className={s.h1}>
          Hi {session.name}! What would you like to do on {session.site} today?
        </h1>
        <ul className={s.choices}>
          <li>
            <Link to={routes.thread('new-change')} className={s.choice}>
              <span className={s.choiceNo}>01</span>
              <span className={s.choiceBody}>
                <span className={s.choiceTitle}>
                  Change something <Badge tone="info">Most asked</Badge>
                </span>
                <span className={s.choiceDesc}>Text, prices, hours, links or videos. {PRICES.change} credits.</span>
              </span>
              <span className={s.choiceArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </li>
          <li>
            <Link to={routes.thread('new-page')} className={s.choice}>
              <span className={s.choiceNo}>02</span>
              <span className={s.choiceBody}>
                <span className={s.choiceTitle}>Add a new page</span>
                <span className={s.choiceDesc}>Built from your site's blocks. RM {PRICES.newPageRm}.</span>
              </span>
              <span className={s.choiceArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        </ul>
      </Columns>
    </AppShell>
  );
}
