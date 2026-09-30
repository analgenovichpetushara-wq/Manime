#!/usr/bin/env node
/**
 * AnimAlc Watch Together relay.
 *
 * Relays room membership, playback markers (play/pause/seek/rate/episode) and
 * chat between participants. It never proxies media: every client streams the
 * episode directly from the provider using its own session. No DRM or access
 * control is bypassed anywhere in this design.
 *
 * Usage: npm run server:watchtogether
 * Env:   PORT (8787) · HOST (0.0.0.0) · ROOM_TTL_MS (2h) · MAX_PARTICIPANTS (24)
 */
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number.parseInt(process.env.PORT ?? '8787', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const ROOM_TTL_MS = Number.parseInt(process.env.ROOM_TTL_MS ?? String(2 * 60 * 60 * 1000), 10);
const MAX_PARTICIPANTS = Number.parseInt(process.env.MAX_PARTICIPANTS ?? '24', 10);
const MAX_CHAT = 200;

/** @type {Map<string, {id: string, code: string, hostId: string, participants: Map<string, any>, playback: any, messages: any[], createdAt: number}>} */
const rooms = new Map();

function createCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return rooms.size === 0 ? code : roomsContainCode(code) ? createCode() : code;
}

function roomsContainCode(code) {
  for (const room of rooms.values()) if (room.code === code) return true;
  return false;
}

function safeSend(socket, payload) {
  if (socket.readyState === 1) socket.send(JSON.stringify(payload));
}

function resolveRoom(codeOrId) {
  if (!codeOrId) return undefined;
  const direct = rooms.get(codeOrId);
  if (direct) return direct;
  for (const room of rooms.values()) if (room.code === codeOrId.toUpperCase()) return room;
  return undefined;
}

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptimeSec: Math.round(process.uptime()) }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AnimAlc Watch Together synchronization server\n');
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (socket) => {
  let room = null;
  let selfId = `p_${Math.random().toString(36).slice(2, 10)}`;

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      safeSend(socket, { type: 'room:error', code: 'invalid_frame', message: 'malformed json' });
      return;
    }
    if (!message || typeof message.type !== 'string') return;

    switch (message.type) {
      case 'room:create': {
        const existing = resolveRoom(message.roomId);
        if (existing) {
          room = existing;
          break;
        }
        const id = message.roomId ?? `room_${Math.random().toString(36).slice(2, 10)}`;
        room = {
          id,
          code: createCode(),
          hostId: selfId,
          participants: new Map(),
          playback: message.playback ?? {
            titleId: '',
            episodeId: '',
            episodeOrdinal: 1,
            positionSec: 0,
            isPlaying: false,
            rate: 1,
            updatedAt: Date.now(),
          },
          messages: [],
          createdAt: Date.now(),
        };
        rooms.set(id, room);
        break;
      }
      case 'room:join': {
        const target = resolveRoom(message.roomId);
        if (!target) {
          safeSend(socket, { type: 'room:error', code: 'room_not_found', message: 'room does not exist' });
          return;
        }
        if (target.participants.size >= MAX_PARTICIPANTS) {
          safeSend(socket, { type: 'room:error', code: 'room_full', message: 'room is full' });
          return;
        }
        room = target;
        break;
      }
      default:
        break;
    }

    if (!room) {
      safeSend(socket, { type: 'room:error', code: 'not_in_room', message: 'join or create a room first' });
      return;
    }

    const displayName = (message.displayName ?? 'Guest').toString().slice(0, 32);

    if (message.type === 'room:create' || message.type === 'room:join') {
      room.participants.set(selfId, {
        id: selfId,
        displayName,
        role: room.hostId === selfId ? 'host' : 'guest',
        joinedAt: Date.now(),
        socket,
        isConnected: true,
      });
      safeSend(socket, roomSnapshot(room, selfId));
      broadcast(room, {
        type: 'room:participants',
        participants: [...room.participants.values()].map((p) => ({ ...p, socket: undefined, isConnected: true })),
      });
      return;
    }

    const isHost = room.hostId === selfId;
    if (!isHost) {
      // Guests may chat, but only the host drives playback.
      if (message.type === 'chat:message') {
        const chat = {
          id: `m_${Math.random().toString(36).slice(2, 10)}`,
          authorId: selfId,
          authorName: room.participants.get(selfId)?.displayName ?? 'Guest',
          text: String(message.text ?? '').slice(0, 500),
          sentAt: Date.now(),
        };
        room.messages.push(chat);
        room.messages = room.messages.slice(-MAX_CHAT);
        broadcast(room, { type: 'chat:message', message: chat });
      }
      return;
    }

    switch (message.type) {
      case 'playback:play':
      case 'playback:pause':
      case 'playback:seek': {
        room.playback = {
          ...room.playback,
          positionSec: Number(message.positionSec) || 0,
          isPlaying: message.type === 'playback:play' ? true : message.type === 'playback:pause' ? false : room.playback.isPlaying,
          updatedAt: Date.now(),
        };
        broadcast(room, { type: 'playback:state', playback: room.playback, serverTime: Date.now() });
        break;
      }
      case 'playback:rate': {
        room.playback = {
          ...room.playback,
          rate: Math.min(2.5, Math.max(0.25, Number(message.rate) || 1)),
          positionSec: Number(message.positionSec) || room.playback.positionSec,
          updatedAt: Date.now(),
        };
        broadcast(room, { type: 'playback:state', playback: room.playback, serverTime: Date.now() });
        break;
      }
      case 'playback:sync': {
        room.playback = { ...message.playback, updatedAt: Date.now() };
        broadcast(room, { type: 'playback:state', playback: room.playback, serverTime: Date.now() });
        break;
      }
      case 'episode:change': {
        room.playback = {
          ...room.playback,
          episodeId: String(message.episodeId ?? ''),
          episodeOrdinal: Number(message.episodeOrdinal) || 1,
          titleId: String(message.titleId ?? room.playback.titleId),
          positionSec: 0,
          isPlaying: false,
          updatedAt: Date.now(),
        };
        broadcast(room, { type: 'playback:state', playback: room.playback, serverTime: Date.now() });
        break;
      }
      case 'chat:message': {
        const chat = {
          id: `m_${Math.random().toString(36).slice(2, 10)}`,
          authorId: selfId,
          authorName: room.participants.get(selfId)?.displayName ?? 'Host',
          text: String(message.text ?? '').slice(0, 500),
          sentAt: Date.now(),
        };
        room.messages.push(chat);
        room.messages = room.messages.slice(-MAX_CHAT);
        broadcast(room, { type: 'chat:message', message: chat });
        break;
      }
      case 'ping': {
        safeSend(socket, { type: 'pong', at: message.at, serverTime: Date.now() });
        break;
      }
      default:
        break;
    }
  });

  socket.on('close', () => {
    if (!room) return;
    room.participants.delete(selfId);
    if (room.participants.size === 0) {
      rooms.delete(room.id);
      return;
    }
    if (room.hostId === selfId) {
      // Host left: promote the longest-present participant so the room survives.
      const next = [...room.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (next) room.hostId = next.id;
    }
    broadcast(room, {
      type: 'room:participants',
      participants: [...room.participants.values()].map((p) => ({ ...p, socket: undefined, isConnected: true })),
    });
  });
});

function roomSnapshot(room, selfId) {
  return {
    type: 'room:state',
    roomId: room.id,
    code: room.code,
    hostId: room.hostId,
    selfId,
    role: room.hostId === selfId ? 'host' : 'guest',
    participants: [...room.participants.values()].map((p) => ({ ...p, socket: undefined, isConnected: true })),
    playback: room.playback,
    messages: room.messages,
    serverTime: Date.now(),
  };
}

function broadcast(room, payload) {
  const frame = JSON.stringify(payload);
  for (const participant of room.participants.values()) {
    if (participant.socket?.readyState === 1) participant.socket.send(frame);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS && room.participants.size === 0) rooms.delete(id);
  }
}, 60_000).unref();

httpServer.listen(PORT, HOST, () => {
// eslint-disable-next-line no-console -- server bootstrap banner
  console.log(`[AnimAlc] Watch Together server listening on ws://${HOST}:${PORT}`);
});

export { httpServer, rooms };
