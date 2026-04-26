import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import type { CoinPackageId } from '@/lib/stripe/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const { userId, coins } = pi.metadata as { userId: string; packageId: CoinPackageId; coins: string };

    const coinsToAdd = parseInt(coins, 10);
    if (!userId || !coinsToAdd) return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 });

    const supabase = await createServiceClient();

    // Add coins atomically
    const { data: newBalance } = await supabase.rpc('add_coins', { p_user_id: userId, p_amount: coinsToAdd });

    await supabase.from('coin_transactions').insert({
      user_id: userId,
      type: 'purchase',
      amount: coinsToAdd,
      balance_after: newBalance ?? 0,
      stripe_payment_intent_id: pi.id,
    });
  }

  return NextResponse.json({ received: true });
}
