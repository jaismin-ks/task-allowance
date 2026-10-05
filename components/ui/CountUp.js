// components/ui/CountUp.js
// Money that counts up to its new value. Mono/tabular digits keep it from jittering;
// skipped under Reduce Motion (jumps straight to the value).
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../lib/prefs';
import { timings } from '../../theme/motion';
import { AppText } from './AppText';

export function CountUp({ value, format, ...textProps }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value;
      setShown(value);
      return undefined;
    }
    const start = from.current;
    const t0 = Date.now();
    let frame;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / timings.COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value, reduced]);

  return <AppText {...textProps}>{format(shown)}</AppText>;
}
