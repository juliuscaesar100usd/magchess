'use client';

import { getSkillConfig } from './skillMap';

type MessageHandler = (line: string) => void;

export class StockfishEngine {
  private worker: Worker | null = null;
  private handlers: MessageHandler[] = [];
  private pendingReady: (() => void)[] = [];
  // All searches are enqueued on this chain so they never overlap.
  // init() wires itself into this chain so searches wait for the engine to be ready.
  private searchChain: Promise<void> = Promise.resolve();

  private serialized<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.searchChain.then(fn);
    // Keep the chain alive even if the task rejects.
    this.searchChain = task.then(() => undefined, () => undefined);
    return task;
  }

  private async _doInit(): Promise<void> {
    this.worker = new Worker('/stockfish/stockfish-18-single.js');
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data.trim() : '';
      if (!line) return;
      if (line === 'uciok') {
        this.pendingReady.forEach((r) => r());
        this.pendingReady = [];
      }
      this.handlers.forEach((h) => h(line));
    };
    // worker.onerror causes the 15s race timeout to win, surfacing the failure.
    this.worker.onerror = () => {};

    await Promise.race([
      new Promise<void>((resolve) => { this.pendingReady.push(resolve); this.send('uci'); }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Engine timed out')), 15_000)),
    ]);

    await new Promise<void>((resolve) => {
      const handler: MessageHandler = (line) => {
        if (line === 'readyok') { this.off(handler); resolve(); }
      };
      this.on(handler);
      this.send('isready');
    });

    // Signal new game once — clears hash tables. Not sent again between moves
    // so the engine keeps its transposition table across moves (faster, more accurate).
    this.send('ucinewgame');
  }

  async init(): Promise<void> {
    if (this.worker) return;
    // Wire init into the search chain: all searches wait for init to complete.
    const initTask = this._doInit();
    this.searchChain = initTask.then(() => undefined, () => undefined);
    await initTask;
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

  getBestMove(fen: string, targetElo: number, movetime = 1000): Promise<string> {
    return this.serialized(() => {
      const cfg = getSkillConfig(targetElo);
      this.send(`setoption name UCI_LimitStrength value ${cfg.limitStrength}`);
      if (cfg.limitStrength) this.send(`setoption name UCI_Elo value ${cfg.uciElo}`);
      this.send(`position fen ${fen}`);
      this.send(`go movetime ${movetime}`);

      return new Promise<string>((resolve) => {
        const handler: MessageHandler = (line) => {
          if (line.startsWith('bestmove')) {
            this.off(handler);
            resolve(line.split(' ')[1] ?? '');
          }
        };
        this.on(handler);
      });
    });
  }

  evaluate(fen: string, depth = 12): Promise<number> {
    return this.serialized(() => {
      this.send('setoption name UCI_LimitStrength value false');
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);

      return new Promise<number>((resolve) => {
        let lastCp = 0;
        const handler: MessageHandler = (line) => {
          if (line.includes('score cp')) {
            const m = line.match(/score cp (-?\d+)/);
            if (m) lastCp = parseInt(m[1], 10);
          } else if (line.includes('score mate')) {
            const m = line.match(/score mate (-?\d+)/);
            if (m) lastCp = parseInt(m[1], 10) > 0 ? 30000 : -30000;
          }
          if (line.startsWith('bestmove')) {
            this.off(handler);
            const isBlack = fen.split(' ')[1] === 'b';
            resolve(isBlack ? -lastCp : lastCp);
          }
        };
        this.on(handler);
      });
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
    this.pendingReady = [];
    this.searchChain = Promise.resolve();
  }
}
