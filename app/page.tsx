import Link from 'next/link';
import { Crown, Zap, Trophy, Brain, Coins, MapPin } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Bullet · Blitz · Rapid', desc: 'Fast-paced time controls with win streaks and milestone badges.' },
  { icon: Trophy, title: 'City Leaderboards', desc: 'Compete with players in your city and climb local rankings.' },
  { icon: Brain, title: 'AI Coach', desc: 'Post-game analysis powered by Stockfish — blunders, mistakes, better moves.' },
  { icon: Coins, title: 'Stake Chess', desc: 'Put coins on the line. Winner takes the pot (minus a small fee).' },
  { icon: MapPin, title: 'Geo Rankings', desc: 'Global and city-filtered leaderboards with shareable badges.' },
  { icon: Crown, title: 'Chess Podcast', desc: 'Real-time audio commentary narrates every move during AI games.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Crown size={48} className="text-amber-400" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
            Mag<span className="text-amber-400">Chess</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-xl mx-auto mb-10">
            Play chess that matters. Compete, learn, stake coins, and climb your city&apos;s leaderboard.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-3.5 text-lg transition-colors"
            >
              Play for Free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold px-8 py-3.5 text-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-sm text-zinc-500">Start with 50 free coins. No credit card required.</p>
        </div>
      </div>

      {/* Features grid */}
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10 text-zinc-200">Everything a serious player needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
                  <Icon size={18} className="text-amber-400" />
                </div>
                <h3 className="font-semibold text-white">{title}</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-2xl px-6 pb-24 text-center">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-zinc-900 border border-amber-500/20 p-10">
          <h2 className="text-3xl font-bold mb-3">Ready to play?</h2>
          <p className="text-zinc-400 mb-6">Join thousands of players competing right now.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-3.5 text-lg transition-colors"
          >
            Get Started — Free
          </Link>
        </div>
      </div>
    </div>
  );
}
