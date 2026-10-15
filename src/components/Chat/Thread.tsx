import { useEffect, useRef } from 'react';
import type { ChatMessage, PageBlock } from '@/data/types';
import { cx } from '@/lib/cx';
import { BlockMap, SketchFrame } from './SketchFrame';
import s from './Chat.module.css';

interface ThreadProps {
  messages: ChatMessage[];
  /** agent-ba is replying. */
  typing?: boolean;
  /** Current page plan, used to draw block-map replies. */
  plan?: PageBlock[];
  /** Rendered after the messages, e.g. the chat-offline state. */
  after?: React.ReactNode;
}

const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Message list. Agent = plain text with a navy rule; you = light-blue bubble (never navy, so it isn't read as a button). */
export function Thread({ messages, typing, plan = [], after }: ThreadProps) {
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length;

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: prefersReduced() ? 'auto' : 'smooth' });
  }, [count, typing, after]);

  return (
    <>
      <ol className={s.thread} aria-label="Conversation with agent-ba" aria-live="polite" aria-relevant="additions">
        {messages.map((m) => (
          <li key={m.id} style={{ display: 'contents' }}>
            {m.from === 'agent' ? <AgentMessage m={m} plan={plan} /> : <MyMessage m={m} />}
          </li>
        ))}
        {typing && (
          <li className={s.typing} aria-label="agent-ba is typing">
            agent-ba is typing <i /> <i /> <i />
          </li>
        )}
      </ol>
      {after}
      <div ref={end} aria-hidden="true" />
    </>
  );
}

function AgentMessage({ m, plan }: { m: ChatMessage; plan: PageBlock[] }) {
  if (!m.blockMap) return <p className={s.agent}>{m.text}</p>;
  return (
    <div className={s.mapReply}>
      <p>{m.text}</p>
      <div className={s.mapGrid}>
        <SketchFrame blocks={plan} />
        <BlockMap blocks={plan} />
      </div>
      <p className={s.mapNote}>We follow your layout using your site's blocks. Spacing and sizes follow your site's style.</p>
    </div>
  );
}

function MyMessage({ m }: { m: ChatMessage }) {
  return (
    <div className={cx(s.me, m.failed && s.failed)}>
      {m.attachments?.map((a, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span className={s.fileName}>You · {a.name}</span>
          <div className={cx(s.bubble, s.bubbleMedia)}>
            {a.url ? <img className={s.thumb} src={a.url} alt={`Your upload: ${a.name}`} /> : <span className={s.fileName}>{a.name} (preview not kept after reload)</span>}
          </div>
        </div>
      ))}
      {m.text && <p className={s.bubble}>{m.text}</p>}
      {m.failed && <span className={s.failedNote}>Not sent yet</span>}
    </div>
  );
}
