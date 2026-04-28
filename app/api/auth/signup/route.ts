import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email, password, username, city, country } = await req.json();

  const db = createAdminClient();

  const { data: existing } = await db
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 400 });

  // Create user with email pre-confirmed — no confirmation email sent,
  // so Supabase's 4-email/hour rate limit is never triggered.
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // The handle_new_user trigger creates the profiles row synchronously.
  await db
    .from('profiles')
    .update({ city, country, username })
    .eq('id', created.user.id);

  return NextResponse.json({ success: true });
}
