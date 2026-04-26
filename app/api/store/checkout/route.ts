import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getStripe, COIN_PACKAGES, type CoinPackageId } from '@/lib/stripe/server';

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { packageId } = await req.json() as { packageId: CoinPackageId };
  const pkg = COIN_PACKAGES[packageId];
  if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 });

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: pkg.amount,
    currency: 'usd',
    metadata: { userId: user.id, packageId, coins: pkg.coins.toString() },
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
