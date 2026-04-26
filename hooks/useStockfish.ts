'use client';

import { useEffect, useRef, useState } from 'react';
import { StockfishEngine } from '@/lib/stockfish/engine';

export function useStockfish() {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;
    engine.init().then(() => setReady(true));
    return () => engine.destroy();
  }, []);

  return { engine: engineRef.current, ready };
}
