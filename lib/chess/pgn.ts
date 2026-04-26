import { Chess } from 'chess.js';

export function parsePgn(pgn: string): Chess {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess;
}

export function getFenHistory(pgn: string): string[] {
  const chess = new Chess();
  const history: string[] = [chess.fen()];
  const moves = parsePgn(pgn).history();

  for (const move of moves) {
    chess.move(move);
    history.push(chess.fen());
  }

  return history;
}
