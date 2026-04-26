'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Crown, LayoutDashboard, Trophy, User, ShoppingBag, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { CoinBalance } from './CoinBalance';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';

const NAV_LINKS = [
  { href: '/game', label: 'Play', icon: LayoutDashboard },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/store', label: 'Store', icon: ShoppingBag },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setProfile } = useAuthStore();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/game" className="flex items-center gap-2">
          <Crown size={22} className="text-amber-400" />
          <span className="text-lg font-bold tracking-tight text-white">MagChess</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              )}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <CoinBalance />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
