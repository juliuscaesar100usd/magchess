'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { subscribeToGame, broadcastMove, broadcastResign, broadcastDrawOffer, broadcastDrawAccept, broadcastDrawDecline } from '@/lib/realtime/gameChannel';
import type { GameEvent, MovePayload } from '@/types/game';

export function useRealtimeGame(gameId: string | null, onEvent: (event: GameEvent) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!gameId) return;
    const channel = subscribeToGame(supabaseRef.current, gameId, onEvent);
    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMove = useCallback(async (payload: MovePayload) => {
    if (channelRef.current) await broadcastMove(channelRef.current, payload);
  }, []);

  const sendResign = useCallback(async (userId: string) => {
    if (channelRef.current) await broadcastResign(channelRef.current, userId);
  }, []);

  const sendDrawOffer = useCallback(async (userId: string) => {
    if (channelRef.current) await broadcastDrawOffer(channelRef.current, userId);
  }, []);

  const sendDrawAccept = useCallback(async () => {
    if (channelRef.current) await broadcastDrawAccept(channelRef.current);
  }, []);

  const sendDrawDecline = useCallback(async () => {
    if (channelRef.current) await broadcastDrawDecline(channelRef.current);
  }, []);

  return { sendMove, sendResign, sendDrawOffer, sendDrawAccept, sendDrawDecline };
}
