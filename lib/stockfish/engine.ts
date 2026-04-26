'use client';

import { getSkillConfig } from './skillMap';

type MessageHandler = (line: string) => void;

export class StockfishEngine {
  private worker: Worker | null = null;
  private handlers: MessageHandler[] = [];
  private ready = false;
  private pendingReady: (() => void)[] = [];

  async init(): Promise<void> {
    if (this.worker) return;

    this.worker = new Worker('/stockfish/stockfish.js');
    this.worker.onmessage = (e: MessageEvent) => {
      const line = e.data as string;
      if (line === 'uciok') {
        this.ready = true;
        this.pendingReady.forEach((r) => r());
        this.pendingReady = [];
      }
      this.handlers.forEach((h) => h(line));
    };

    await new Promise<void>((resolve) => {
      if (this.ready) return resolve();
      this.pendingReady.push(resolve);
      this.send('uci');
    });

    this.send('isready');
    await new Promise<void>((resolve) => {
      const handler: MessageHandler = (line) => {
        if (line === 'readyok') {
          this.off(handler);
          resolve();
        }
      };
      this.on(handler);
    });
  }

  send(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  on(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  off(handler: MessageHandler): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  async getBestMove(fen: string, targetElo: number, movetime = 1000): Promise<string> {
    const cfg = getSkillConfig(targetElo);
    this.send(`setoption name UCI_LimitStrength value ${cfg.limitStrength}`);
    if (cfg.limitStrength) {
      this.send(`setoption name UCI_Elo value ${cfg.uciElo}`);
    }
    this.send('ucinewgame');
    this.send(`position fen ${fen}`);
    this.send(`go movetime ${movetime}`);

    return new Promise((resolve) => {
      const handler: MessageHandler = (line) => {
        if (line.startsWith('bestmove')) {
          this.off(handler);
          const move = line.split(' ')[1];
          resolve(move);
        }
      };
      this.on(handler);
    });
  }

  async evaluate(fen: string, depth = 12): Promise<number> {
    this.send('setoption name UCI_LimitStrength value false');
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);

    return new Promise((resolve) => {
      let lastCp = 0;
      const handler: MessageHandler = (line) => {
        if (line.includes('score cp')) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) lastCp = parseInt(match[1], 10);
        } else if (line.includes('score mate')) {
          const match = line.match(/score mate (-?\d+)/);
          if (match) lastCp = parseInt(match[1], 10) > 0 ? 30000 : -30000;
        }
        if (line.startsWith('bestmove')) {
          this.off(handler);
          // Flip sign if it's black's turn (engine always reports from mover's perspective)
          const isBlackToMove = fen.split(' ')[1] === 'b';
          resolve(isBlackToMove ? -lastCp : lastCp);
        }
      };
      this.on(handler);
    });
  }

  stop(): void {
    this.send('stop');
  }

  destroy(): void {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.handlers = [];
    this.ready = false;
  }
}
