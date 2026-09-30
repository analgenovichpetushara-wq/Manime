import http from 'node:http';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import WebSocket from 'ws';
import {
  WatchTogetherClient,
  type RoomSnapshot,
  type WatchTogetherClientOptions,
  type WebSocketLike,
} from '@/features/watchtogether/sync/client';
import type { ChatMessage, SyncParticipant, SyncPlaybackState } from '@/data/models/watchTogether';

jest.setTimeout(40_000);

const PORT = 8971;
const URL = `ws://127.0.0.1:${PORT}`;

function socketFactory(url: string): WebSocketLike {
  return new WebSocket(url) as unknown as WebSocketLike;
}

function waitFor(predicate: () => boolean, timeoutMs = 12_000, label = 'condition'): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`timeout waiting for ${label}`));
      }
    }, 50);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let server: ChildProcessWithoutNullStreams | null = null;
const clients: WatchTogetherClient[] = [];

function makeClient(options: WatchTogetherClientOptions) {
  const client = new WatchTogetherClient({ ...options, socketFactory });
  clients.push(client);
  return client;
}

beforeAll(async () => {
  server = spawn(process.execPath, [path.join(process.cwd(), 'server', 'watch-together-server.mjs')], {
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as unknown as ChildProcessWithoutNullStreams;

  let output = '';
  server.stdout.on('data', (chunk) => {
    output += String(chunk);
  });
  server.stderr.on('data', (chunk) => {
    output += String(chunk);
  });
  await waitFor(() => output.includes('listening'), 15_000, 'server start');
});

afterAll(async () => {
  for (const client of clients) client.disconnect();
  await delay(150);
  server?.kill('SIGKILL');
  server = null;
});

describe('watch together over a real websocket server', () => {
  it('creates a room, shares the code and syncs a second participant', async () => {
    let hostState: RoomSnapshot | null = null;
    const host = makeClient({
      url: URL,
      roomId: `room_test_${Date.now()}`,
      displayName: 'Host',
      isHost: true,
      handlers: { onRoomState: (snapshot) => (hostState = snapshot) },
    });
    host.connect();
    await waitFor(() => hostState !== null, 10_000, 'host room state');

    const code = (hostState as unknown as RoomSnapshot).code;
    expect(code).toMatch(/^[A-Z0-9]{6}$/);

    const guestParticipants: SyncParticipant[][] = [];
    let guestState: RoomSnapshot | null = null;
    const guest = makeClient({
      url: URL,
      roomId: code,
      displayName: 'Guest',
      isHost: false,
      handlers: {
        onRoomState: (snapshot) => (guestState = snapshot),
        onParticipants: (participants) => guestParticipants.push(participants),
      },
    });
    guest.connect();

    await waitFor(() => guestState !== null, 10_000, 'guest room state');
    expect((guestState as unknown as RoomSnapshot).role).toBe('guest');
    expect((guestState as unknown as RoomSnapshot).code).toBe(code);
    await waitFor(() => guestParticipants.some((list) => list.length >= 2), 10_000, 'participant broadcast');
  });

  it('propagates host play/pause/seek to guests and keeps guests read-only', async () => {
    let hostState: RoomSnapshot | null = null;
    const hostPlayback: SyncPlaybackState[] = [];
    const hostChats: ChatMessage[] = [];
    const host = makeClient({
      url: URL,
      roomId: `room_sync_${Date.now()}`,
      displayName: 'Host',
      isHost: true,
      handlers: {
        onRoomState: (snapshot) => (hostState = snapshot),
        onPlayback: (playback) => hostPlayback.push(playback),
        onChat: (message) => hostChats.push(message),
      },
    });
    host.connect();
    await waitFor(() => hostState !== null, 10_000, 'host room state');
    const code = (hostState as unknown as RoomSnapshot).code;

    const guestPlayback: SyncPlaybackState[] = [];
    const guestChats: ChatMessage[] = [];
    let guestState: RoomSnapshot | null = null;
    const guest = makeClient({
      url: URL,
      roomId: code,
      displayName: 'Guest',
      isHost: false,
      handlers: {
        onRoomState: (snapshot) => (guestState = snapshot),
        onPlayback: (playback) => guestPlayback.push(playback),
        onChat: (message) => guestChats.push(message),
      },
    });
    guest.connect();
    await waitFor(() => guestState !== null, 10_000, 'guest room state');

    host.sendPlay(30);
    await waitFor(() => guestPlayback.some((state) => state.isPlaying && Math.abs(state.positionSec - 30) < 0.001), 10_000, 'play propagation');

    host.sendSeek(90);
    await waitFor(() => guestPlayback.some((state) => Math.abs(state.positionSec - 90) < 0.001), 10_000, 'seek propagation');

    host.sendPause(95);
    await waitFor(() => guestPlayback.some((state) => !state.isPlaying && Math.abs(state.positionSec - 95) < 0.001), 10_000, 'pause propagation');

    host.sendEpisodeChange('e2', 2, 'anilibria:1');
    await waitFor(() => guestPlayback.some((state) => state.episodeId === 'e2' && state.episodeOrdinal === 2), 10_000, 'episode propagation');

    guest.sendChat('привет из комнаты');
    await waitFor(() => hostChats.some((message) => message.text === 'привет из комнаты'), 10_000, 'chat to host');

    host.sendChat('привет гостю');
    await waitFor(() => guestChats.some((message) => message.text === 'привет гостю'), 10_000, 'chat to guest');

    // Guests cannot drive playback: no new playback state should reach them.
    const before = guestPlayback.length;
    guest.sendSeek(10);
    guest.sendPlay(10);
    await delay(600);
    expect(guestPlayback.length).toBe(before);
  });

  it('answers health checks over http', async () => {
    const payload = await new Promise<{ ok: boolean; rooms: number }>((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port: PORT, path: '/health' }, (response) => {
          let body = '';
          response.on('data', (chunk) => (body += String(chunk)));
          response.on('end', () => {
            try {
              resolve(JSON.parse(body) as { ok: boolean; rooms: number });
            } catch (error) {
              reject(error as Error);
            }
          });
        })
        .on('error', reject);
    });
    expect(payload.ok).toBe(true);
    expect(typeof payload.rooms).toBe('number');
  });

  it('reports a room that does not exist instead of failing silently', async () => {
    const errors: { code: string; message: string }[] = [];
    let state: RoomSnapshot | null = null;
    const client = makeClient({
      url: URL,
      roomId: 'ZZZZZZ',
      displayName: 'Lost',
      isHost: false,
      handlers: {
        onRoomState: (snapshot) => (state = snapshot),
        onError: (code, message) => errors.push({ code, message }),
      },
    });
    client.connect();
    await waitFor(() => errors.length > 0, 10_000, 'room_not_found error');
    expect(errors[0]?.code).toBe('room_not_found');
    expect(state).toBeNull();
  });

  it('promotes the remaining participant when the host leaves', async () => {
    let hostState: RoomSnapshot | null = null;
    const host = makeClient({
      url: URL,
      roomId: `room_handover_${Date.now()}`,
      displayName: 'Host',
      isHost: true,
      handlers: { onRoomState: (snapshot) => (hostState = snapshot) },
    });
    host.connect();
    await waitFor(() => hostState !== null, 10_000, 'host room state');
    const code = (hostState as unknown as RoomSnapshot).code;

    let guestState: RoomSnapshot | null = null;
    const participants: SyncParticipant[][] = [];
    const guest = makeClient({
      url: URL,
      roomId: code,
      displayName: 'Guest',
      isHost: false,
      handlers: {
        onRoomState: (snapshot) => (guestState = snapshot),
        onParticipants: (list) => participants.push(list),
      },
    });
    guest.connect();
    await waitFor(() => guestState !== null, 10_000, 'guest room state');

    host.disconnect();
    await waitFor(
      () => {
        const latest = participants[participants.length - 1];
        return Boolean(latest && latest.filter((item) => item.isConnected).length === 1);
      },
      10_000,
      'host removal broadcast',
    );
    const remaining = participants[participants.length - 1] ?? [];
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.displayName).toBe('Guest');
  });
});
