'use client';

import { useEffect, useState } from 'react';
import { Trophy, Globe, MapPin, Share2, Medal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import type { Profile } from '@/types/user';
import clsx from 'clsx';

type View = 'global' | 'city';

export default function LeaderboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const [view, setView] = useState<View>('global');
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from('profiles')
        .select('id, username, rating, city, country, coins')
        .order('rating', { ascending: false })
        .limit(50);

      if (view === 'city' && profile?.city) {
        query = query.eq('city', profile.city).eq('country', profile.country ?? '');
      }

      const { data } = await query;
      setPlayers((data as Profile[]) ?? []);

      // Find my rank
      if (profile) {
        const myIdx = data?.findIndex((p) => p.id === profile.id);
        setMyRank(myIdx !== undefined && myIdx >= 0 ? myIdx + 1 : null);
      }

      setLoading(false);
    };
    load();
  }, [view, profile?.city]); // eslint-disable-line react-hooks/exhaustive-deps

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={16} className="text-amber-400" />;
    if (rank === 2) return <Medal size={16} className="text-zinc-400" />;
    if (rank === 3) return <Medal size={16} className="text-amber-700" />;
    return <span className="text-zinc-500 text-sm w-4 text-center">{rank}</span>;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          {view === 'city' && profile?.city && (
            <p className="text-zinc-400 text-sm mt-0.5">{profile.city}, {profile.country}</p>
          )}
        </div>

        <div className="flex rounded-xl border border-zinc-700 overflow-hidden">
          <button
            onClick={() => setView('global')}
            className={clsx('flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors', view === 'global' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-800')}
          >
            <Globe size={15} />Global
          </button>
          <button
            onClick={() => setView('city')}
            className={clsx('flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors', view === 'city' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-800')}
          >
            <MapPin size={15} />My City
          </button>
        </div>
      </div>

      {myRank && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center justify-between">
          <span className="text-amber-400 text-sm font-medium">
            Your rank: #{myRank}
          </span>
          {myRank === 1 && (
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'MagChess', text: `I'm #1 in ${view === 'city' ? profile?.city : 'the world'} on MagChess!` });
                }
              }}
              className="flex items-center gap-1.5 text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
            >
              <Share2 size={12} />
              Share badge
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-zinc-500 text-sm animate-pulse">Loading rankings…</div>
          </div>
        ) : players.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-zinc-500 text-sm">No players found</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[40px_1fr_100px_80px] gap-2 px-4 py-2.5 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Rating</span>
              <span className="text-right">Location</span>
            </div>
            {players.map((p, i) => (
              <div
                key={p.id}
                className={clsx(
                  'grid grid-cols-[40px_1fr_100px_80px] gap-2 px-4 py-3 items-center border-b border-zinc-800/50 last:border-0 transition-colors hover:bg-zinc-800/30',
                  p.id === profile?.id && 'bg-amber-500/5'
                )}
              >
                <div className="flex items-center justify-center">{getRankIcon(i + 1)}</div>
                <div>
                  <span className={clsx('font-medium text-sm', p.id === profile?.id ? 'text-amber-400' : 'text-white')}>
                    {p.username}
                    {p.id === profile?.id && ' (You)'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">{p.rating}</span>
                </div>
                <div className="text-right text-xs text-zinc-500 truncate">{p.city ?? '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
