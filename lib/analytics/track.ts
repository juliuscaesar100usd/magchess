'use client';

import { createClient } from '@/lib/supabase/client';

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      properties: properties ?? null,
      user_id: userId ?? null,
    });
  } catch {
    // Analytics failures should never break the app
  }
}
