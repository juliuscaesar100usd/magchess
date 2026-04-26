import { GameLobby } from '@/components/game/GameLobby';

export default function GamePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Play Chess</h1>
        <p className="text-zinc-400 text-sm mt-1">Choose your opponent, time control, and optional stake</p>
      </div>
      <GameLobby />
    </div>
  );
}
