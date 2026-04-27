'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Coins, Brain, Palette, Check, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore, type BoardTheme } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { COIN_PACKAGES, type CoinPackageId } from '@/lib/stripe/packages';
import { createClient } from '@/lib/supabase/client';
import type { PurchaseItem } from '@/types/user';
import clsx from 'clsx';
import { trackEvent } from '@/lib/analytics/track';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const COSMETICS: { item: PurchaseItem; theme: BoardTheme; label: string; preview: [string, string] }[] = [
  { item: 'board_classic', theme: 'board_classic', label: 'Classic Wood', preview: ['#b58863', '#f0d9b5'] },
  { item: 'board_wood', theme: 'board_wood', label: 'Dark Wood', preview: ['#8b5e3c', '#d4a96a'] },
  { item: 'board_neon', theme: 'board_neon', label: 'Neon Night', preview: ['#1a1a3e', '#2d2d6b'] },
  { item: 'board_marble', theme: 'board_marble', label: 'Marble', preview: ['#7c7c8e', '#e8e8f0'] },
];

function CheckoutForm({ onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/store?success=1` },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed');
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={processing}>
        {processing ? 'Processing…' : 'Pay Now'}
      </Button>
    </form>
  );
}

export default function StorePage() {
  const profile = useAuthStore((s) => s.profile);
  const { updateCoins } = useAuthStore();
  const { setBoardTheme, boardTheme } = useSettingsStore();
  const [purchases, setPurchases] = useState<Set<PurchaseItem>>(new Set());
  const [selectedPackage, setSelectedPackage] = useState<CoinPackageId | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [buyingItem, setBuyingItem] = useState<PurchaseItem | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') setSuccessOpen(true);
  }, []);

  useEffect(() => {
    if (!profile) return;
    createClient()
      .from('purchases')
      .select('item')
      .eq('user_id', profile.id)
      .then(({ data }) => {
        if (data) setPurchases(new Set(data.map((d) => d.item as PurchaseItem)));
      });
  }, [profile]);

  const openCheckout = async (pkgId: CoinPackageId) => {
    setSelectedPackage(pkgId);
    const res = await fetch('/api/store/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: pkgId }),
    });
    const data = await res.json();
    if (data.clientSecret) {
      setClientSecret(data.clientSecret);
      setCheckoutOpen(true);
    }
  };

  const buyItem = async (item: PurchaseItem) => {
    setBuyingItem(item);
    const res = await fetch('/api/store/buy-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    });
    const data = await res.json();
    if (data.success) {
      setPurchases((prev) => new Set(Array.from(prev).concat(item)));
      updateCoins(data.newBalance);
      trackEvent('purchase', { item }, profile?.id);
    } else {
      alert(data.error);
    }
    setBuyingItem(null);
  };

  const PACKAGES = Object.entries(COIN_PACKAGES) as [CoinPackageId, (typeof COIN_PACKAGES)[CoinPackageId]][];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Store</h1>
        <p className="text-zinc-400 text-sm mt-1">Buy coins, unlock AI Coach, and customize your board</p>
      </div>

      {/* Upgrade to Pro */}
      <section>
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-zinc-900 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/15 flex-shrink-0">
              <Zap size={22} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Upgrade to Pro</h3>
              <p className="text-sm text-zinc-400 mt-0.5">Unlimited AI analysis + all chessboards unlocked</p>
            </div>
          </div>
          <Button variant="secondary" className="flex-shrink-0 opacity-60 cursor-not-allowed" disabled>
            $23.99 / mo
          </Button>
        </div>
      </section>

      {/* Coin packages */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Coins size={18} className="text-amber-400" />
          <h2 className="text-lg font-bold text-white">Buy Coins</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PACKAGES.map(([id, pkg]) => (
            <div key={id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col items-center gap-3 hover:border-amber-500/30 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
                <Coins size={22} className="text-amber-400" />
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{pkg.coins.toLocaleString()}</div>
                <div className="text-xs text-zinc-400">coins</div>
              </div>
              <Button size="sm" className="w-full" onClick={() => openCheckout(id)}>
                ${(pkg.amount / 100).toFixed(2)}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* AI Coach */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Brain size={18} className="text-purple-400" />
          <h2 className="text-lg font-bold text-white">AI Coach</h2>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">Unlimited AI Analysis</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              Post-game analysis with blunder detection, eval bar, and coaching explanations.
              {' '}<span className="text-purple-400">First use is free!</span>
            </p>
          </div>
          {purchases.has('ai_coach') ? (
            <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium flex-shrink-0">
              <Check size={16} />
              Owned
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => buyItem('ai_coach')}
              disabled={buyingItem === 'ai_coach'}
              className="flex-shrink-0"
            >
              <Coins size={14} className="mr-1.5 text-amber-400" />
              500 coins
            </Button>
          )}
        </div>
      </section>

      {/* Board themes */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Palette size={18} className="text-blue-400" />
          <h2 className="text-lg font-bold text-white">Board Themes</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COSMETICS.map(({ item, theme, label, preview }) => {
            const owned = purchases.has(item);
            const active = boardTheme === theme;
            return (
              <div
                key={item}
                className={clsx(
                  'rounded-2xl border p-4 flex flex-col items-center gap-3 transition-all',
                  active ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                )}
              >
                {/* Mini board preview */}
                <div className="grid grid-cols-4 grid-rows-4 w-16 h-16 rounded overflow-hidden">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const row = Math.floor(i / 4);
                    const col = i % 4;
                    const isDark = (row + col) % 2 === 1;
                    return <div key={i} style={{ backgroundColor: isDark ? preview[0] : preview[1] }} />;
                  })}
                </div>
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                {owned ? (
                  <Button
                    size="sm"
                    variant={active ? 'primary' : 'secondary'}
                    className="w-full"
                    onClick={() => setBoardTheme(active ? 'default' : theme)}
                  >
                    {active ? 'Active' : 'Use'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => buyItem(item)}
                    disabled={buyingItem === item}
                  >
                    <Coins size={12} className="mr-1 text-amber-400" />
                    300 coins
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Stripe checkout modal */}
      {checkoutOpen && clientSecret && (
        <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title={`Buy ${selectedPackage ? COIN_PACKAGES[selectedPackage].label : ''}`}>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <CheckoutForm
              clientSecret={clientSecret}
              onSuccess={() => { setCheckoutOpen(false); setSuccessOpen(true); }}
            />
          </Elements>
        </Modal>
      )}

      <Modal open={successOpen} onClose={() => setSuccessOpen(false)} title="Purchase Complete!">
        <div className="text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-zinc-300 mb-4">Your coins have been credited to your account.</p>
          <Button className="w-full" onClick={() => setSuccessOpen(false)}>Continue</Button>
        </div>
      </Modal>
    </div>
  );
}
