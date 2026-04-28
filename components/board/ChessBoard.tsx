'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { StockfishEngine } from '@/lib/stockfish/engine';
import { getMoveQuality } from '@/lib/stockfish/evaluator';
import { generateCommentary } from '@/lib/commentary/generator';
import { usePodcast } from '@/hooks/usePodcast';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useRealtimeGame } from '@/hooks/useRealtimeGame';
import { TIME_CONTROLS } from '@/lib/chess/timeControls';
import { BOARD_THEMES } from '@/lib/chess/boardThemes';
import { Timer } from './Timer';
import { BoardControls } from './BoardControls';
import { MoveHistory } from './MoveHistory';
import { PodcastToggle } from '@/components/game/PodcastToggle';
import { StreakSaveModal } from '@/components/game/StreakSaveModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { GameEvent, GameResult } from '@/types/game';

interface ChessBoardProps {
  gameId: string;
}

export function ChessBoard({ gameId }: ChessBoardProps) {
  const profile = useAuthStore((s) => s.profile);
  const { gameType, gameMode, aiLevel, playerColor, stakeAmount, streakAtRisk, setResult, setStreakAtRisk } = useGameStore();
  const { boardTheme, podcastEnabled } = useSettingsStore();
  const { speak } = usePodcast();

  const chessRef = useRef(new Chess());
  const engineRef = useRef<StockfishEngine | null>(null);
  const prevEvalRef = useRef<number>(0);
  const isAiThinkingRef = useRef(false);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const [, setGameResult] = useState<GameResult | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [drawOfferPending, setDrawOfferPending] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const tc = TIME_CONTROLS[gameMode];
  const initMs = tc.minutes * 60 * 1000;
  const incrementMs = tc.increment * 1000;
  const isWhite = playerColor === 'white';
  const opponentLabel = gameType === 'ai' ? `Computer (${aiLevel})` : 'Opponent';

  const whiteTimer = useGameTimer({ initialMs: initMs, incrementMs, onTimeout: () => endGame(isWhite ? 'black_wins' : 'white_wins') });
  const blackTimer = useGameTimer({ initialMs: initMs, incrementMs, onTimeout: () => endGame(isWhite ? 'white_wins' : 'black_wins') });

  const playerTimer = isWhite ? whiteTimer : blackTimer;
  const opponentTimer = isWhite ? blackTimer : whiteTimer;

  const endGame = useCallback(async (result: GameResult) => {
    if (gameOver) return;
    setGameOver(true);
    setGameResult(result);
    setResult(result);
    whiteTimer.stop();
    blackTimer.stop();

    const isWin = (result === 'white_wins' && isWhite) || (result === 'black_wins' && !isWhite);
    const isDraw = result === 'draw';
    setResultMessage(isDraw ? "It's a draw!" : isWin ? 'You won! 🎉' : 'You lost.');

    const chess = chessRef.current;
    const res = await fetch('/api/game/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, result, pgn: chess.pgn() }),
    });
    const data = await res.json();
    if (data.streakAtRisk && data.streakAtRisk > 0) {
      setStreakAtRisk(data.streakAtRisk);
      setStreakModalOpen(true);
    }
  }, [gameOver, isWhite, gameId, whiteTimer, blackTimer, setResult, setStreakAtRisk]);

  const handleRealtimeEvent = useCallback((event: GameEvent) => {
    if (event.type === 'move') {
      const chess = chessRef.current;
      chess.move({ from: event.payload.from, to: event.payload.to, promotion: event.payload.promotion });
      setFen(chess.fen());
      setMoves(chess.history());
      if (chess.turn() === 'w') { blackTimer.stop(); blackTimer.addIncrement(); whiteTimer.start(); }
      else { whiteTimer.stop(); whiteTimer.addIncrement(); blackTimer.start(); }
      if (chess.isGameOver()) endGame(getChessResult(chess));
    } else if (event.type === 'resign') {
      const resignerIsOpponent = event.payload.userId !== profile?.id;
      endGame(resignerIsOpponent ? (isWhite ? 'white_wins' : 'black_wins') : (isWhite ? 'black_wins' : 'white_wins'));
    } else if (event.type === 'draw_offer') {
      if (event.payload.userId !== profile?.id) setDrawOfferPending(true);
    } else if (event.type === 'draw_accept') {
      endGame('draw');
    } else if (event.type === 'draw_decline') {
      setDrawOfferPending(false);
    }
  }, [profile?.id, endGame, isWhite, whiteTimer, blackTimer]);

  const { sendMove, sendResign, sendDrawOffer, sendDrawAccept, sendDrawDecline } =
    useRealtimeGame(gameType === 'pvp' ? gameId : null, handleRealtimeEvent);

  // playerMoveSan: the SAN of the move the human just played, used for podcast commentary.
  const makeAiMove = useCallback(async (engine: StockfishEngine, playerMoveSan?: string) => {
    if (isAiThinkingRef.current) return;
    isAiThinkingRef.current = true;
    const chess = chessRef.current;

    // All evaluations go through the engine's serial queue, so they never overlap.
    // Evaluate current position (after player's move) first — needed for both player
    // move commentary and as the "before" baseline for AI move commentary.
    let evalCurrent = 0;
    if (podcastEnabled) {
      evalCurrent = await engine.evaluate(chess.fen(), 12);
      if (playerMoveSan) {
        const quality = getMoveQuality(prevEvalRef.current, evalCurrent, playerColor === 'white');
        speak(generateCommentary(quality, playerMoveSan, playerColor === 'white' ? 'White' : 'Black'));
      }
    }

    const movetime = gameMode === 'bullet' ? 200 : gameMode === 'blitz' ? 500 : 1000;
    const bestMove = await engine.getBestMove(chess.fen(), aiLevel, movetime);
    if (!bestMove || bestMove === '(none)') { isAiThinkingRef.current = false; return; }

    const from = bestMove.slice(0, 2) as Square;
    const to = bestMove.slice(2, 4) as Square;
    const promotion = bestMove[4];
    const moveResult = chess.move({ from, to, promotion: promotion || undefined });
    if (!moveResult) { isAiThinkingRef.current = false; return; }

    setFen(chess.fen());
    setMoves(chess.history());

    if (podcastEnabled) {
      const evalAfter = await engine.evaluate(chess.fen(), 12);
      const aiIsBlack = playerColor === 'white';
      const quality = getMoveQuality(evalCurrent, evalAfter, !aiIsBlack);
      speak(generateCommentary(quality, moveResult.san, aiIsBlack ? 'Black' : 'White'));
      prevEvalRef.current = evalAfter;
    }

    if (isWhite) { blackTimer.stop(); blackTimer.addIncrement(); whiteTimer.start(); }
    else { whiteTimer.stop(); whiteTimer.addIncrement(); blackTimer.start(); }

    isAiThinkingRef.current = false;
    if (chess.isGameOver()) endGame(getChessResult(chess));
  }, [podcastEnabled, gameMode, aiLevel, playerColor, isWhite, whiteTimer, blackTimer, endGame, speak]);

  useEffect(() => {
    if (gameType !== 'ai') return;
    const engine = new StockfishEngine();
    engineRef.current = engine;
    engine.init()
      .then(() => {
        if (playerColor === 'white') whiteTimer.start();
        else { blackTimer.start(); makeAiMove(engine); }
      })
      .catch(() => setEngineError(true));
    return () => engine.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameType !== 'pvp') return;
    whiteTimer.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback(
    ({ sourceSquare, targetSquare, piece }: { sourceSquare: string; targetSquare: string | null; piece: { pieceType: string; position: string; isSparePiece: boolean } }): boolean => {
      if (gameOver || !targetSquare) return false;
      const chess = chessRef.current;
      const isPlayerTurn = (chess.turn() === 'w' && playerColor === 'white') || (chess.turn() === 'b' && playerColor === 'black');
      if (!isPlayerTurn) return false;

      const pieceType = piece.pieceType; // e.g. "wP", "bK"
      const promotion = pieceType[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : undefined;
      const moveResult = chess.move({ from: sourceSquare as Square, to: targetSquare as Square, promotion });
      if (!moveResult) return false;

      const newFen = chess.fen();
      setFen(newFen);
      setMoves(chess.history());

      if (isWhite) { whiteTimer.stop(); whiteTimer.addIncrement(); blackTimer.start(); }
      else { blackTimer.stop(); blackTimer.addIncrement(); whiteTimer.start(); }

      if (chess.isGameOver()) { endGame(getChessResult(chess)); return true; }

      if (gameType === 'pvp') {
        sendMove({ from: sourceSquare, to: targetSquare, promotion, fen: newFen, pgn: chess.pgn(), moveNumber: chess.moveNumber() });
      } else if (gameType === 'ai' && engineRef.current) {
        const eng = engineRef.current;
        const moveSan = moveResult.san;
        setTimeout(() => makeAiMove(eng, moveSan), 100);
      }
      return true;
    },
    [gameOver, playerColor, gameType, isWhite, whiteTimer, blackTimer, endGame, sendMove, makeAiMove]
  );

  const handleResign = async () => {
    setShowResignConfirm(false);
    if (gameType === 'pvp' && profile) await sendResign(profile.id);
    endGame(playerColor === 'white' ? 'black_wins' : 'white_wins');
  };

  const theme = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.default;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
      <div className="flex flex-col gap-3 w-full max-w-[560px]">
        {engineError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Chess engine failed to load. Please refresh the page.
          </div>
        )}
        <Timer timeMs={opponentTimer.timeMs} active={!isWhite ? whiteTimer.running : blackTimer.running} label={opponentLabel} />
        <div className="rounded-xl overflow-hidden shadow-2xl border border-zinc-700">
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: onDrop,
              boardOrientation: playerColor,
              darkSquareStyle: theme.dark,
              lightSquareStyle: theme.light,
              boardStyle: { borderRadius: '0px' },
              allowDrawingArrows: true,
            }}
          />
        </div>
        <Timer timeMs={playerTimer.timeMs} active={isWhite ? whiteTimer.running : blackTimer.running} label="You" />
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {gameType === 'ai' && <PodcastToggle />}
        {stakeAmount > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-400">
            💰 Stake: {stakeAmount} coins each
          </div>
        )}
        <MoveHistory moves={moves} />
        {!gameOver && (
          <BoardControls
            onResign={() => setShowResignConfirm(true)}
            onDrawOffer={() => sendDrawOffer(profile?.id ?? '')}
            drawOfferPending={drawOfferPending}
            onDrawAccept={async () => { setDrawOfferPending(false); if (gameType === 'pvp') await sendDrawAccept(); endGame('draw'); }}
            onDrawDecline={() => { setDrawOfferPending(false); sendDrawDecline(); }}
            gameType={gameType}
          />
        )}
      </div>

      <Modal open={showResignConfirm} onClose={() => setShowResignConfirm(false)} title="Resign?">
        <p className="text-zinc-400 text-sm mb-4">Are you sure you want to resign?</p>
        <div className="flex gap-3">
          <Button variant="danger" className="flex-1" onClick={handleResign}>Resign</Button>
          <Button variant="ghost" className="flex-1" onClick={() => setShowResignConfirm(false)}>Cancel</Button>
        </div>
      </Modal>

      <Modal open={gameOver && !streakModalOpen} onClose={() => {}} hideClose title="Game Over">
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-2">{resultMessage}</p>
          <p className="text-zinc-400 text-sm mb-5">{moves.length} moves played</p>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => window.location.href = '/game'}>Play Again</Button>
            <Button variant="secondary" className="flex-1" onClick={() => window.location.href = '/profile'}>View Stats</Button>
          </div>
        </div>
      </Modal>

      <StreakSaveModal open={streakModalOpen} streak={streakAtRisk} gameId={gameId} onClose={() => setStreakModalOpen(false)} />
    </div>
  );
}

function getChessResult(chess: Chess): GameResult {
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) return 'draw';
  return chess.turn() === 'w' ? 'black_wins' : 'white_wins';
}
