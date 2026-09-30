import type { ChatMessage, SyncParticipant, SyncPlaybackState, SyncRole } from '@/data/models/watchTogether';
import { createLogger } from '@/core/logging/logger';
import { shortRoomCode } from '@/core/utils/id';
import { decode, encode, PROTOCOL_VERSION, type ClientMessage } from '@/features/watchtogether/sync/protocol';

const log = createLogger('watch-together-client');

export interface RoomSnapshot {
  roomId: string;
  code: string;
  hostId: string;
  selfId: string;
  role: SyncRole;
  participants: SyncParticipant[];
  playback: SyncPlaybackState;
  messages: ChatMessage[];
}

export interface WatchTogetherClientHandlers {
  onRoomState?: (snapshot: RoomSnapshot) => void;
  onPlayback?: (playback: SyncPlaybackState, serverTime: number) => void;
  onParticipants?: (participants: SyncParticipant[]) => void;
  onChat?: (message: ChatMessage) => void;
  onStatus?: (status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'unavailable', details?: { attempt?: number }) => void;
  onError?: (code: string, message: string) => void;
}

export type WatchTogetherStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'unavailable';

export interface WatchTogetherClientOptions {
  url: string;
  roomId: string;
  displayName: string;
  isHost: boolean;
  initialPlayback?: SyncPlaybackState;
  handlers?: WatchTogetherClientHandlers;
  socketFactory?: (url: string) => WebSocketLike;
  maxReconnectAttempts?: number;
}

/** Minimal socket surface so tests can inject a fake transport. */
export interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readyState: number;
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
}

export const MAX_MESSAGES = 200;

export function defaultPlayback(): SyncPlaybackState {
  return {
    titleId: '',
    episodeId: '',
    episodeOrdinal: 1,
    positionSec: 0,
    isPlaying: false,
    rate: 1,
    updatedAt: Date.now(),
  };
}

export function createRoomId(): string {
  return `room_${shortRoomCode().toLowerCase()}${Math.random().toString(36).slice(2, 6)}`;
}

export function chatMessage(text: string, authorId: string, authorName: string): ChatMessage {
  return { id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, authorId, authorName, text, sentAt: Date.now() };
}

/**
 * Watch Together client.
 *
 * The server only relays playback markers and chat; the media itself is always
 * fetched by each device straight from the provider, so nothing is re-streamed
 * and no DRM/access control is touched.
 */
export class WatchTogetherClient {
  private socket: WebSocketLike | null = null;
  private attempt = 0;
  private closedByUser = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshot: RoomSnapshot | null = null;

  constructor(private readonly options: WatchTogetherClientOptions) {}

  get isConnected(): boolean {
    return this.socket?.readyState === 1;
  }

  get current(): RoomSnapshot | null {
    return this.snapshot;
  }

  connect(): void {
    if (!this.options.url) {
      this.options.handlers?.onStatus?.('unavailable');
      return;
    }
    this.closedByUser = false;
    this.options.handlers?.onStatus?.(this.attempt === 0 ? 'connecting' : 'reconnecting', { attempt: this.attempt });
    const factory = this.options.socketFactory ?? ((url: string) => new WebSocket(url) as unknown as WebSocketLike);
    let socket: WebSocketLike;
    try {
      socket = factory(this.options.url);
    } catch (error) {
      log.warn('socket creation failed', { error: String(error) });
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.attempt = 0;
      this.options.handlers?.onStatus?.('connected');
      const message: ClientMessage = this.options.isHost
        ? {
            type: 'room:create',
            roomId: this.options.roomId,
            displayName: this.options.displayName,
            playback: this.options.initialPlayback ?? defaultPlayback(),
            protocol: PROTOCOL_VERSION,
          }
        : {
            type: 'room:join',
            roomId: this.options.roomId,
            displayName: this.options.displayName,
            protocol: PROTOCOL_VERSION,
          };
      this.send(message);
      this.startHeartbeat();
    };

    socket.onmessage = (event) => this.handleMessage(event.data);

    socket.onerror = () => {
      this.options.handlers?.onError?.('socket_error', 'connection error');
    };

    socket.onclose = () => {
      this.stopHeartbeat();
      if (this.closedByUser) {
        this.options.handlers?.onStatus?.('closed');
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    const max = this.options.maxReconnectAttempts ?? 8;
    if (this.attempt >= max) {
      this.options.handlers?.onStatus?.('closed');
      return;
    }
    this.options.handlers?.onStatus?.('reconnecting', { attempt: this.attempt });
    const delay = Math.min(30_000, 500 * 2 ** this.attempt);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      this.send({ type: 'ping', at: Date.now() });
    }, 15_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private handleMessage(raw: unknown): void {
    const message = decode(raw);
    if (!message) {
      log.warn('dropped malformed frame');
      return;
    }
    switch (message.type) {
      case 'room:state': {
        this.snapshot = {
          roomId: message.roomId,
          code: message.code,
          hostId: message.hostId,
          selfId: message.selfId,
          role: message.role,
          participants: message.participants,
          playback: message.playback,
          messages: message.messages.slice(-MAX_MESSAGES),
        };
        this.options.handlers?.onRoomState?.(this.snapshot);
        break;
      }
      case 'playback:state': {
        if (this.snapshot) this.snapshot = { ...this.snapshot, playback: message.playback };
        this.options.handlers?.onPlayback?.(message.playback, message.serverTime);
        break;
      }
      case 'room:participants': {
        if (this.snapshot) this.snapshot = { ...this.snapshot, participants: message.participants };
        this.options.handlers?.onParticipants?.(message.participants);
        break;
      }
      case 'chat:message': {
        if (this.snapshot) this.snapshot = { ...this.snapshot, messages: [...this.snapshot.messages, message.message].slice(-MAX_MESSAGES) };
        this.options.handlers?.onChat?.(message.message);
        break;
      }
      case 'room:error': {
        this.options.handlers?.onError?.(message.code, message.message);
        break;
      }
      case 'pong':
      default:
        break;
    }
  }

  private send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== 1) return;
    try {
      this.socket.send(encode(message));
    } catch (error) {
      log.warn('send failed', { error: String(error) });
    }
  }

  sendPlay(positionSec: number): void {
    this.send({ type: 'playback:play', positionSec, at: Date.now() });
  }

  sendPause(positionSec: number): void {
    this.send({ type: 'playback:pause', positionSec, at: Date.now() });
  }

  sendSeek(positionSec: number): void {
    this.send({ type: 'playback:seek', positionSec, at: Date.now() });
  }

  sendRate(rate: number, positionSec: number): void {
    this.send({ type: 'playback:rate', rate, positionSec, at: Date.now() });
  }

  sendEpisodeChange(episodeId: string, episodeOrdinal: number, titleId: string, positionSec = 0): void {
    void positionSec;
    this.send({ type: 'episode:change', episodeId, episodeOrdinal, titleId, at: Date.now() });
  }

  sendChat(text: string, authorName = this.options.displayName): void {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    this.send({ type: 'chat:message', text: trimmed });
    // Optimistic echo so the sender sees their own message before the server round-trip.
    this.options.handlers?.onChat?.(chatMessage(trimmed, this.snapshot?.selfId ?? 'self', authorName));
  }

  disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopHeartbeat();
    this.send({ type: 'room:leave', roomId: this.options.roomId });
    try {
      this.socket?.close();
    } catch {
      // closing an already closed socket is not an error worth surfacing
    }
    this.socket = null;
  }
}
