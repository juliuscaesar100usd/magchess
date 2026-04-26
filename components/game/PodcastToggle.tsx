'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import clsx from 'clsx';

export function PodcastToggle() {
  const { podcastEnabled, togglePodcast } = useSettingsStore();

  return (
    <button
      onClick={togglePodcast}
      title={podcastEnabled ? 'Disable commentary' : 'Enable commentary'}
      className={clsx(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border transition-all',
        podcastEnabled
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
          : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:border-zinc-600'
      )}
    >
      {podcastEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
      <span className="hidden sm:inline">{podcastEnabled ? 'Commentary On' : 'Commentary Off'}</span>
    </button>
  );
}
