import { forwardRef, useImperativeHandle, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import type { Attachment } from '@/data/types';
import { cx } from '@/lib/cx';
import s from './Chat.module.css';

export const MAX_FILES = 5;
export const MAX_BYTES = 5 * 1024 * 1024;

/** Checks picked files against the limits. Returns the ones to keep and a message for the rest. */
export function checkFiles(picked: File[], already: number): { ok: Attachment[]; error: string | null } {
  const ok: Attachment[] = [];
  const problems: string[] = [];
  for (const file of picked) {
    if (!file.type.startsWith('image/')) problems.push(`${file.name} isn't an image`);
    else if (file.size > MAX_BYTES) problems.push(`${file.name} is over 5 MB`);
    else if (already + ok.length >= MAX_FILES) problems.push(`only ${MAX_FILES} screenshots per message`);
    else ok.push({ name: file.name, size: file.size, url: URL.createObjectURL(file) });
  }
  return { ok, error: problems.length ? `Not added: ${[...new Set(problems)].join(', ')}.` : null };
}

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  sending?: boolean;
  hint?: string;
  /** Extra control between the attach button and the text box (08: "Upload a layout sketch"). */
  extra?: ReactNode;
  placeholder?: string;
}

export interface ComposerHandle {
  focus: () => void;
}

/** Bottom composer: + attach (up to 5 screenshots, 5 MB each), text box, Send. Enter sends, Shift+Enter adds a line. */
export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { value, onChange, onSend, sending, hint = 'Screenshots: up to 5, 5 MB each.', extra, placeholder = "Tell agent-ba what you'd like…" },
  ref,
) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => textRef.current?.focus() }));

  const canSend = !sending && (value.trim().length > 0 || files.length > 0);

  const send = () => {
    if (!canSend) return;
    onSend(value.trim(), files);
    setFiles([]);
    setError(null);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const { ok, error: err } = checkFiles([...(e.target.files ?? [])], files.length);
    setFiles((fs) => [...fs, ...ok]);
    setError(err);
    e.target.value = '';
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <form
      className={s.composer}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      aria-label="Message agent-ba"
    >
      {files.length > 0 && (
        <ul className={s.chips} aria-label="Screenshots to send" style={{ margin: 0, listStyle: 'none' }}>
          {files.map((f, i) => (
            <li key={f.url ?? i} className={s.chip}>
              <span>{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={cx(s.composerRow, !extra && s.noExtra)}>
        <button
          type="button"
          className={s.attach}
          aria-label={`Add screenshots (${files.length} of ${MAX_FILES})`}
          title="Add screenshots"
          disabled={files.length >= MAX_FILES || sending}
          onClick={() => fileRef.current?.click()}
        >
          +
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPick} data-testid="screenshots" />
        {extra}
        <textarea
          ref={textRef}
          rows={1}
          className={s.input}
          aria-label="Message agent-ba"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" className={s.send} disabled={!canSend} loading={sending} loadingLabel="Sending…">
          Send
        </Button>
      </div>
      <div className={s.hintRow} aria-live="polite">
        {error ? <span className={s.hintError}>{error}</span> : <span>{hint}</span>}
      </div>
    </form>
  );
});
