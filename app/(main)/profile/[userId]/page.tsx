'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Badge, Streak } from '@/types/user';
import type { RatingHistory, GameWithPlayers } from '@/types/game';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Flame, Swords } from 'lucide-react';
import clsx from 'clsx';

interface PageProps { params: Promise<{ userId: string }> }

export default function PublicProfilePage({ params }: PageProps) {
  const { userId } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingHistory[]>([]);
  const [games, setGames] = useState<GameWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [pRes, sRes, bRes, rRes, gRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('streaks').select('*').eq('user_id', userId).single(),
        supabase.from('badges').select('*').eq('user_id', userId).order('earned_at', { ascending: false }),
        supabase.from('rating_history').select('*').eq('user_id', userId).order('recorded_at', { ascending: true }).limit(30),
        supabase.from('games').select('*, white_player:white_player_id(username), black_player:black_player_id(username)')
          .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
          .order('started_at', { ascending: false }).limit(10),
      ]);
      setProfile(pRes.data as Profile | null);
      setStreak(sRes.data as Streak | null);
      setBadges((bRes.data as Badge[]) ?? []);
      setRatingHistory((rRes.data as RatingHistory[]) ?? []);
      setGames((gRes.data as GameWithPlayers[]) ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return <div className="flex items-center justify-center h-32 text-zinc-400 text-sm animate-pulse">Loading…</div>;
  if (!profile) return <div className="text-center text-zinc-400 py-16">Player not found</div>;

  const chartData = ratingHistory.map((r, i) => ({ name: `G${i + 1}`, rating: r.rating_after }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex items-start gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 flex-shrink-0">
          <span className="text-3xl font-bold text-amber-400">{profile.username[0].toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
          <p className="text-zinc-400 text-sm">{profile.city}{profile.city && profile.country ? ', ' : ''}{profile.country}</p>
          <div className="flex flex-wrap gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-sm"><TrendingUp size={15} className="text-amber-400" /><span className="font-bold text-amber-400">{profile.rating}</span><span className="text-zinc-500">ELO</span></div>
            <div className="flex items-center gap-1.5 text-sm"><Flame size={15} className="text-orange-400" /><span className="font-bold text-orange-400">{streak?.current_streak ?? 0}</span><span className="text-zinc-500">streak</span></div>
          </div>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Rating History</h2>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" hide />
              <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} itemStyle={{ color: '#f59e0b' }} />
              <Line type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {badges.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5">
                <span className="text-xs font-medium text-zinc-300">{b.badge_label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Games</h2>
        </div>
        {games.map((g) => {
          const isWhite = g.white_player_id === userId;
          const isWin = (isWhite && g.result === 'white_wins') || (!isWhite && g.result === 'black_wins');
          const isDraw = g.result === 'draw';
          return (
            <Link key={g.id} href={`/game/${g.id}/review`} className="grid grid-cols-[1fr_80px_60px] gap-2 px-5 py-3 items-center border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <Swords size={13} className="text-zinc-500" />
                <span className="text-sm text-white">{isWhite ? g.black_player?.username ?? 'AI' : g.white_player?.username}</span>
              </div>
              <span className={clsx('text-sm font-semibold text-center', isDraw ? 'text-zinc-400' : isWin ? 'text-green-400' : 'text-red-400')}>
                {g.result ? (isDraw ? 'Draw' : isWin ? 'Won' : 'Lost') : 'Ongoing'}
              </span>
              <span className="text-right text-xs text-zinc-500 capitalize">{g.mode}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
