'use client';

import { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Brain, ChevronLeft, ChevronRight, Lock, Loader2 } from 'lucide-react';
import type { CoachAnalysis, CoachLevel } from '@/types/coach';
import { BlunderCard } from './BlunderCard';
import { EvalBar } from '@/components/board/EvalBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/useAuthStore';
import { getFenHistory } from '@/lib/chess/pgn';
import clsx from 'clsx';
import { trackEvent } from '@/lib/analytics/track';

interface CoachPanelProps {
  gameId: string;
  pgn: string;
}

export function CoachPanel({ gameId, pgn }: CoachPanelProps) {
  const profile = useAuthStore((s) => s.profile);
  const { updateCoins } = useAuthStore();
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsPurchase, setNeedsPurchase] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [level, setLevel] = useState<CoachLevel>('beginner');

  const [fenHistory, setFenHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEval, setCurrentEval] = useState(0);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/coach/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, level }),
    });

    if (res.status === 402) {
      setNeedsPurchase(true);
      setLoading(false);
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Analysis failed');
    } else {
      setAnalysis(data as CoachAnalysis);
      const fens = getFenHistory(pgn);
      setFenHistory(fens);
      setCurrentIndex(fens.length - 1);
      trackEvent('coach_use', { gameId }, profile?.id);
    }
    setLoading(false);
  }, [gameId, level, pgn, profile?.id]);

  const handlePurchase = async () => {
    setPurchasing(true);
    const res = await fetch('/api/store/buy-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: 'ai_coach' }),
    });
    const data = await res.json();
    if (data.success) {
      updateCoins(data.newBalance);
      setPurchaseModal(false);
      setNeedsPurchase(false);
      fetchAnalysis();
    } else {
      alert(data.error);
    }
    setPurchasing(false);
  };

  const navigateTo = (index: number) => {
    setCurrentIndex(index);
    if (analysis) {
      // Find eval at this position from blunders/mistakes
      const moveNum = Math.ceil(index / 2);
      const critique = [...(analysis.blunders ?? []), ...(analysis.mistakes ?? [])].find(
        (c) => c.move_number === moveNum
      );
      if (critique) setCurrentEval(critique.eval_after);
    }
  };

  if (!pgn) return null;

  const currentFen = fenHistory[currentIndex] ?? new Chess().fen();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={18} className="text-purple-400" />
        <h2 className="font-bold text-white">AI Coach</h2>
        <span className="ml-auto text-xs text-zinc-500">Powered by Stockfish</span>
      </div>

      {!analysis && !loading && !needsPurchase && (
        <div className="text-center py-4">
          <p className="text-zinc-400 text-sm mb-4">
            Analyze this game to find blunders, mistakes, and better moves.
            {!profile?.id && ' First analysis is free!'}
          </p>
          <Button onClick={fetchAnalysis} variant="secondary" className="w-full">
            <Brain size={15} className="mr-1.5" />
            Analyze Game
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 size={24} className="text-purple-400 animate-spin" />
          <p className="text-zinc-400 text-sm">Analyzing with Stockfish at depth 14…</p>
          <p className="text-zinc-500 text-xs">This may take up to 30 seconds</p>
        </div>
      )}

      {needsPurchase && (
        <div className="text-center py-4">
          <Lock size={24} className="text-zinc-500 mx-auto mb-3" />
          <p className="text-zinc-300 font-medium mb-1">Free analysis used</p>
          <p className="text-zinc-400 text-sm mb-4">Unlock unlimited AI Coach for 500 coins</p>
          <Button onClick={() => setPurchaseModal(true)} className="w-full">
            Unlock AI Coach — 500 coins
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          {/* Level toggle */}
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            {(['beginner', 'advanced'] as CoachLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={clsx('flex-1 py-1.5 text-sm font-medium transition-colors capitalize', level === l ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:bg-zinc-800')}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Accuracy */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-800 p-3 text-center">
              <div className="text-2xl font-bold text-white">{analysis.accuracy_white.toFixed(0)}%</div>
              <div className="text-xs text-zinc-400">White accuracy</div>
            </div>
            <div className="rounded-xl bg-zinc-800 p-3 text-center">
              <div className="text-2xl font-bold text-white">{analysis.accuracy_black.toFixed(0)}%</div>
              <div className="text-xs text-zinc-400">Black accuracy</div>
            </div>
          </div>

          {/* Replay board */}
          {fenHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <EvalBar evaluation={currentEval} />
                <div className="flex-1">
                  <Chessboard
                    options={{
                      position: currentFen,
                      allowDragging: false,
                      boardStyle: { borderRadius: '8px', border: '1px solid #3f3f46', width: '240px' },
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-zinc-400 flex-1 text-center">
                  Move {currentIndex} / {fenHistory.length - 1}
                </span>
                <button
                  onClick={() => navigateTo(Math.min(fenHistory.length - 1, currentIndex + 1))}
                  disabled={currentIndex === fenHistory.length - 1}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Blunders */}
          {analysis.blunders.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                Blunders ({analysis.blunders.length})
              </h3>
              <div className="space-y-2">
                {analysis.blunders.map((b, i) => (
                  <BlunderCard
                    key={i}
                    critique={b}
                    level={level}
                    onSelect={(fen) => {
                      const idx = fenHistory.indexOf(fen);
                      if (idx >= 0) navigateTo(idx);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mistakes */}
          {analysis.mistakes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">
                Mistakes ({analysis.mistakes.length})
              </h3>
              <div className="space-y-2">
                {analysis.mistakes.map((m, i) => (
                  <BlunderCard
                    key={i}
                    critique={m}
                    level={level}
                    onSelect={(fen) => {
                      const idx = fenHistory.indexOf(fen);
                      if (idx >= 0) navigateTo(idx);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {analysis.blunders.length === 0 && analysis.mistakes.length === 0 && (
            <p className="text-center text-zinc-400 text-sm py-2">
              🎉 No blunders or mistakes found! Excellent game.
            </p>
          )}
        </div>
      )}

      <Modal open={purchaseModal} onClose={() => setPurchaseModal(false)} title="Unlock AI Coach">
        <div className="text-center">
          <Brain size={32} className="text-purple-400 mx-auto mb-3" />
          <p className="text-zinc-300 mb-1">Unlock unlimited AI Coach for <span className="text-amber-400 font-bold">500 coins</span></p>
          <p className="text-zinc-500 text-sm mb-4">Analyze all your games forever</p>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handlePurchase} disabled={purchasing}>
              {purchasing ? 'Purchasing…' : 'Buy for 500 coins'}
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setPurchaseModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
