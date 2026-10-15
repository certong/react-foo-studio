import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import s from './Toast.module.css';

type Tone = 'success' | 'error';
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<((text: string, tone?: Tone) => void) | null>(null);
const DURATION_MS = 5000;
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (text: string, tone: Tone = 'success') => {
      const id = nextId++;
      setItems((xs) => [...xs, { id, text, tone }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={s.region} role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx(s.toast, t.tone === 'error' && s.error)}>
            <span className={s.icon} aria-hidden="true">
              {t.tone === 'error' ? '!' : '✓'}
            </span>
            {t.text}
            <button type="button" className={s.close} aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}
