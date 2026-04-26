import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId } = await req.json() as { gameId: string };

  // Deduct 10 coins atomically
  try {
    const newBalance = await supabase.rpc('deduct_coins', { p_user_id: user.id, p_amount: 10 });
    if (newBalance.error) throw newBalance.error;

    await supabase.from('coin_transactions').insert({
      user_id: user.id,
      game_id: gameId,
      type: 'streak_save',
      amount: -10,
      balance_after: newBalance.data,
    });

    // Do NOT reset streak — just return success
    return NextResponse.json({ success: true, newBalance: newBalance.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save streak';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
