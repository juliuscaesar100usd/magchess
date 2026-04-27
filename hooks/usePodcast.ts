'use client';

import { useCallback, useEffect, useRef } from 'react';

export function usePodcast() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      // No localService filter — Android devices often only have remote (non-local) voices.
      voiceRef.current = voices.find((v) => v.lang.startsWith('en')) ?? null;
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // resume() before cancel() — Android Chrome can get stuck in paused state,
    // causing subsequent speak() calls to queue silently and never play.
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    if (voiceRef.current) utterance.voice = voiceRef.current;
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  return { speak, cancel };
}
