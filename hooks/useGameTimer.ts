'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseGameTimerOptions {
  initialMs: number;
  incrementMs: number;
  onTimeout: () => void;
}

export function useGameTimer({ initialMs, incrementMs, onTimeout }: UseGameTimerOptions) {
  const [timeMs, setTimeMs] = useState(initialMs);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeMsRef = useRef(initialMs);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const tick = useCallback(() => {
    timeMsRef.current -= 100;
    if (timeMsRef.current <= 0) {
      timeMsRef.current = 0;
      setTimeMs(0);
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      onTimeoutRef.current();
    } else {
      setTimeMs(timeMsRef.current);
    }
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    setRunning(true);
    intervalRef.current = setInterval(tick, 100);
  }, [tick]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const addIncrement = useCallback(() => {
    timeMsRef.current += incrementMs;
    setTimeMs(timeMsRef.current);
  }, [incrementMs]);

  const reset = useCallback((ms?: number) => {
    stop();
    const newTime = ms ?? initialMs;
    timeMsRef.current = newTime;
    setTimeMs(newTime);
  }, [stop, initialMs]);

  useEffect(() => () => stop(), [stop]);

  return { timeMs, running, start, stop, addIncrement, reset };
}
