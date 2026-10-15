import { useRef, type KeyboardEvent } from 'react';
import s from './SegmentedSwitch.module.css';

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
  count?: number;
}

interface SegmentedSwitchProps<K extends string> {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  className?: string;
}

export function SegmentedSwitch<K extends string>({ options, value, onChange, label, className }: SegmentedSwitchProps<K>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const n = options.length;

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : step ? (index + step + n) % n : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={[s.track, className].filter(Boolean).join(' ')} onKeyDown={onKeyDown}>
      <span
        aria-hidden="true"
        className={s.thumb}
        style={{ width: `calc((100% - 6px) / ${n})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o, i) => {
        const selected = i === index;
        return (
          <button
            key={o.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={s.tab}
            onClick={() => onChange(o.key)}
          >
            {o.label}
            {o.count !== undefined && <span className={s.count}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
