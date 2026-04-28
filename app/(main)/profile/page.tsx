'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import type { Badge, Streak } from '@/types/user';
import type { GameWithPlayers, RatingHistory } from '@/types/game';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, Star, Clock, Swords, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

const BADGE_ICONS: Record<string, string> = {
  newbie: '🌱',
  not_bad: '👍',
  pretty_good: '🔥',
  strong_enough: '💪',
  sigma: '⚡',
  are_you_cheater: '🤖',
};

export default function ProfilePage() {
  const profile = useAuthStore((s) => s.profile);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingHistory[]>([]);
  const [games, setGames] = useState<GameWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const supabase = createClient();
      const [streakRes, badgesRes, ratingRes, gamesRes] = await Promise.all([
        supabase.from('streaks').select('current_streak, best_streak').eq('user_id', profile.id).single(),
        supabase.from('badges').select('id, badge_key, badge_label').eq('user_id', profile.id).order('earned_at', { ascending: false }),
        supabase.from('rating_history').select('rating_after').eq('user_id', profile.id).order('recorded_at', { ascending: true }).limit(50),
        supabase
          .from('games')
          .select(`id, white_player_id, black_player_id, ai_level, mode, result,
                   stake_amount, white_rating_before, white_rating_after,
                   black_rating_before, black_rating_after, started_at,
                   white_player:white_player_id(username),
                   black_player:black_player_id(username)`)
          .or(`white_player_id.eq.${profile.id},black_player_id.eq.${profile.id}`)
          .order('started_at', { ascending: false })
          .limit(20),
      ]);

      setStreak(streakRes.data as Streak | null);
      setBadges((badgesRes.data as Badge[]) ?? []);
      setRatingHistory((ratingRes.data as RatingHistory[]) ?? []);
      setGames((gamesRes.data as unknown as GameWithPlayers[]) ?? []);
      setLoading(false);
    };
    load();
  }, [profile]);

  if (!profile || loading) {
    return <div className="flex items-center justify-center h-32 text-zinc-400 text-sm animate-pulse">Loading profile…</div>;
  }

  const wins = games.filter((g) => {
    const isWhite = g.white_player_id === profile.id;
    return (isWhite && g.result === 'white_wins') || (!isWhite && g.result === 'black_wins');
  }).length;
  const draws = games.filter((g) => g.result === 'draw').length;
  const losses = games.length - wins - draws;

  const chartData = ratingHistory.map((r, i) => ({
    name: `G${i + 1}`,
    rating: r.rating_after,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex items-start gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 flex-shrink-0">
          <span className="text-3xl font-bold text-amber-400">{profile.username[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{profile.city}{profile.city && profile.country ? ', ' : ''}{profile.country}</p>
          <div className="flex flex-wrap gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp size={15} className="text-amber-400" />
              <span className="font-bold text-amber-400">{profile.rating}</span>
              <span className="text-zinc-500">ELO</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Flame size={15} className="text-orange-400" />
              <span className="font-bold text-orange-400">{streak?.current_streak ?? 0}</span>
              <span className="text-zinc-500">streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Star size={15} className="text-zinc-400" />
              <span className="font-bold text-zinc-300">{streak?.best_streak ?? 0}</span>
              <span className="text-zinc-500">best streak</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{games.length}</div>
          <div className="text-xs text-zinc-500">games</div>
          <div className="mt-1 text-sm">
            <span className="text-green-400">{wins}W</span>
            <span className="text-zinc-500 mx-1">·</span>
            <span className="text-zinc-400">{draws}D</span>
            <span className="text-zinc-500 mx-1">·</span>
            <span className="text-red-400">{losses}L</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Chart */}
        {chartData.length > 1 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Rating History</h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" hide />
                <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Line type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Badges</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  title={b.badge_label}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5"
                >
                  <span>{BADGE_ICONS[b.badge_key] ?? '🏅'}</span>
                  <span className="text-xs font-medium text-zinc-300">{b.badge_label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game History */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Games</h2>
        </div>
        {games.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No games yet</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {games.map((g) => {
              const isWhite = g.white_player_id === profile.id;
              const opponentProfile = isWhite ? g.black_player : g.white_player;
              const isAI = !g.black_player_id;
              const opponentName = isAI ? `AI (${g.ai_level})` : (opponentProfile?.username ?? 'Unknown');

              const isWin = (isWhite && g.result === 'white_wins') || (!isWhite && g.result === 'black_wins');
              const isDraw = g.result === 'draw';
              const resultLabel = g.result ? (isDraw ? 'Draw' : isWin ? 'Won' : 'Lost') : 'Ongoing';
              const ratingAfter = isWhite ? g.white_rating_after : g.black_rating_after;
              const ratingBefore = isWhite ? g.white_rating_before : g.black_rating_before;
              const delta = ratingAfter && ratingBefore ? ratingAfter - ratingBefore : null;

              return (
                <Link key={g.id} href={`/game/${g.id}/review`} className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-5 py-3 items-center hover:bg-zinc-800/40 transition-colors cursor-pointer">
                  <div>
                    <div className="flex items-center gap-2">
                      <Swords size={13} className="text-zinc-500 flex-shrink-0" />
                      <span className="text-sm text-white font-medium">{opponentName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={12} className="text-zinc-600" />
                      <span className="text-xs text-zinc-500 capitalize">{g.mode}</span>
                      {g.stake_amount > 0 && (
                        <span className="text-xs text-amber-500/70">• {g.stake_amount}🪙</span>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={clsx(
                      'text-sm font-semibold px-2 py-0.5 rounded',
                      isDraw ? 'text-zinc-400' : isWin ? 'text-green-400' : 'text-red-400'
                    )}>
                      {resultLabel}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    {delta !== null && (
                      <span className={clsx('font-medium', delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-400')}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    {new Date(g.started_at).toLocaleDateString()}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
