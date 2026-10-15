import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 420;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts from the previous value to the new one (ease-out cubic). Jumps straight there under reduced motion. */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reducedMotion()) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(origin + (value - origin) * eased);
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{shown}</>;
}
