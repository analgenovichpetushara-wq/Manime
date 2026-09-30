export type SyncRole = 'host' | 'guest';

export type SyncEventType =
  | 'room:state'
  | 'room:join'
  | 'room:leave'
  | 'room:participants'
  | 'playback:play'
  | 'playback:pause'
  | 'playback:seek'
  | 'playback:rate'
  | 'playback:sync'
  | 'episode:change'
  | 'chat:message';

export interface SyncParticipant {
  id: string;
  displayName: string;
  role: SyncRole;
  joinedAt: number;
  isConnected: boolean;
}

export interface SyncPlaybackState {
  titleId: string;
  episodeId: string;
  episodeOrdinal: number;
  positionSec: number;
  isPlaying: boolean;
  rate: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  sentAt: number;
}

export interface RoomState {
  roomId: string;
  code: string;
  hostId: string;
  participants: SyncParticipant[];
  playback: SyncPlaybackState;
  messages: ChatMessage[];
  createdAt: number;
}
