'use client';

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { GameEvent, MovePayload } from '@/types/game';
import type { GameResult } from '@/types/game';

export function subscribeToGame(
  supabase: SupabaseClient,
  gameId: string,
  onEvent: (event: GameEvent) => void
): RealtimeChannel {
  return supabase
    .channel(`game:${gameId}`)
    .on('broadcast', { event: 'move' }, ({ payload }) =>
      onEvent({ type: 'move', payload: payload as MovePayload })
    )
    .on('broadcast', { event: 'resign' }, ({ payload }) =>
      onEvent({ type: 'resign', payload: payload as { userId: string } })
    )
    .on('broadcast', { event: 'draw_offer' }, ({ payload }) =>
      onEvent({ type: 'draw_offer', payload: payload as { userId: string } })
    )
    .on('broadcast', { event: 'draw_accept' }, () =>
      onEvent({ type: 'draw_accept' })
    )
    .on('broadcast', { event: 'draw_decline' }, () =>
      onEvent({ type: 'draw_decline' })
    )
    .on('broadcast', { event: 'game_end' }, ({ payload }) =>
      onEvent({ type: 'game_end', payload: payload as { result: GameResult } })
    )
    .subscribe();
}

export async function broadcastMove(
  channel: RealtimeChannel,
  payload: MovePayload
): Promise<void> {
  await channel.send({ type: 'broadcast', event: 'move', payload });
}

export async function broadcastResign(
  channel: RealtimeChannel,
  userId: string
): Promise<void> {
  await channel.send({ type: 'broadcast', event: 'resign', payload: { userId } });
}

export async function broadcastDrawOffer(
  channel: RealtimeChannel,
  userId: string
): Promise<void> {
  await channel.send({ type: 'broadcast', event: 'draw_offer', payload: { userId } });
}

export async function broadcastDrawAccept(channel: RealtimeChannel): Promise<void> {
  await channel.send({ type: 'broadcast', event: 'draw_accept', payload: {} });
}

export async function broadcastDrawDecline(channel: RealtimeChannel): Promise<void> {
  await channel.send({ type: 'broadcast', event: 'draw_decline', payload: {} });
}
