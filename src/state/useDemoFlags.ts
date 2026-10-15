import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resetDemo, setLowCredits, simulateOffline } from '@/api/studio';

/**
 * Demo switches for reviewing states that are hard to reach by clicking:
 * `?demo=low-credits` (10 free credits), `?demo=offline` (next chat send fails once), `?demo=reset`.
 * Home and Past requests also read `?demo=empty`.
 */
export function useDemoFlags() {
  const [params] = useSearchParams();
  const demo = params.get('demo');
  useEffect(() => {
    if (demo === 'low-credits') setLowCredits();
    else if (demo === 'offline') simulateOffline(1);
    else if (demo === 'reset') resetDemo();
  }, [demo]);
}
