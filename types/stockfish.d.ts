declare module 'stockfish' {
  interface StockfishInstance {
    postMessage(command: string): void;
    onmessage: (line: string) => void;
  }
  function initEngine(enginePath?: string): StockfishInstance;
  export default initEngine;
}
