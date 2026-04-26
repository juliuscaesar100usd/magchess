import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/ui/AuthProvider';

export const metadata: Metadata = {
  title: 'MagChess — Play, Compete & Learn Chess',
  description: 'A modern chess platform with AI, stake games, city leaderboards, and AI coaching.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-100 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
