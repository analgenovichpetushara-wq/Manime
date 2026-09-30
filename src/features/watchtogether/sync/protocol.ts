import type { ChatMessage, SyncParticipant, SyncPlaybackState, SyncRole } from '@/data/models/watchTogether';

export const PROTOCOL_VERSION = 1;

export type ClientMessage =
  | { type: 'room:create'; roomId: string; displayName: string; playback: SyncPlaybackState; protocol: number }
  | { type: 'room:join'; roomId: string; displayName: string; protocol: number }
  | { type: 'room:leave'; roomId: string }
  | { type: 'playback:play'; positionSec: number; at: number }
  | { type: 'playback:pause'; positionSec: number; at: number }
  | { type: 'playback:seek'; positionSec: number; at: number }
  | { type: 'playback:rate'; rate: number; positionSec: number; at: number }
  | { type: 'playback:sync'; playback: SyncPlaybackState }
  | { type: 'episode:change'; episodeId: string; episodeOrdinal: number; titleId: string; at: number }
  | { type: 'chat:message'; text: string }
  | { type: 'ping'; at: number };

export type ServerMessage =
  | {
      type: 'room:state';
      roomId: string;
      code: string;
      hostId: string;
      selfId: string;
      role: SyncRole;
      participants: SyncParticipant[];
      playback: SyncPlaybackState;
      messages: ChatMessage[];
      serverTime: number;
    }
  | { type: 'room:participants'; participants: SyncParticipant[] }
  | { type: 'playback:state'; playback: SyncPlaybackState; serverTime: number }
  | { type: 'chat:message'; message: ChatMessage }
  | { type: 'room:error'; code: string; message: string }
  | { type: 'pong'; at: number; serverTime: number };

export function encode(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}

/** Safe decoder: malformed frames never throw into the UI layer. */
export function decode(raw: unknown): ServerMessage | null {
  try {
    const text = typeof raw === 'string' ? raw : String(raw);
    const parsed = JSON.parse(text) as ServerMessage;
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as { type?: unknown }).type !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}
