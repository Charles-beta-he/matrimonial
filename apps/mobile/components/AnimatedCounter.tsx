import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

interface AnimatedCounterProps extends Omit<TextProps, 'children'> {
  value: number;
  duration?: number;
}

export function AnimatedCounter({ value, duration = 600, ...textProps }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startTimeRef.current = performance.now();
    startValueRef.current = display;

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValueRef.current + (value - startValueRef.current) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <Text {...textProps}>{display}</Text>;
}
