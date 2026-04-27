import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { PurchaseItem } from '@/types/user';

const ITEM_COSTS: Record<PurchaseItem, number> = {
  ai_coach: 500,
  board_classic: 300,
  board_wood: 300,
  board_neon: 300,
  board_marble: 300,
};

export async function POST(req: NextRequest) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createAdminClient();

  const { item } = await req.json() as { item: PurchaseItem };
  const cost = ITEM_COSTS[item];
  if (!cost) return NextResponse.json({ error: 'Invalid item' }, { status: 400 });

  const { data: existing } = await db
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('item', item)
    .single();

  if (existing) return NextResponse.json({ error: 'Already owned' }, { status: 400 });

  let newBalance: number;
  try {
    const { data, error } = await db.rpc('deduct_coins', { p_user_id: user.id, p_amount: cost });
    if (error) throw error;
    newBalance = data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to deduct coins';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await db.from('purchases').insert({ user_id: user.id, item });

  const txType = item === 'ai_coach' ? 'coach_purchase' : 'cosmetic_purchase';
  await db.from('coin_transactions').insert({
    user_id: user.id,
    type: txType,
    amount: -cost,
    balance_after: newBalance,
  });

  return NextResponse.json({ success: true, newBalance });
}
