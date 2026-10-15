import { forwardRef, useImperativeHandle, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import s from './Field.module.css';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  /** id of the visible label for the group. */
  labelledBy: string;
  describedBy?: string;
}

export interface PinInputHandle {
  focus: () => void;
}

/** One box per digit. Typing moves forward, Backspace moves back, pasting fills every box. */
export const PinInput = forwardRef<PinInputHandle, PinInputProps>(function PinInput(
  { value, onChange, length = 6, invalid, disabled, labelledBy, describedBy },
  ref,
) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useImperativeHandle(ref, () => ({
    focus: () => boxes.current[Math.min(value.length, length - 1)]?.focus(),
  }));

  const focusBox = (i: number) => boxes.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const setDigit = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, length));
  };

  const onInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;
    if (typed.length > 1) {
      // Autofill or a fast typist: spread the digits from this box onwards.
      const next = (digits.slice(0, i).join('') + typed).slice(0, length);
      onChange(next);
      focusBox(next.length);
      return;
    }
    setDigit(i, typed);
    focusBox(i + 1);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) setDigit(i, '');
      else if (i > 0) {
        setDigit(i - 1, '');
        focusBox(i - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focusBox(pasted.length);
  };

  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className={s.pin} data-invalid={invalid || undefined}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          className={s.pinBox}
          value={d}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
        />
      ))}
    </div>
  );
});
