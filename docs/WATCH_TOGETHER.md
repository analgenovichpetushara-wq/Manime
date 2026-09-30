# Watch Together

Watch Together keeps a room of people watching the *same source* in step. The
video is played locally on every device; only the playback *state* travels over a
WebSocket. No media is proxied and no stream is re-hosted.

## Why a server is required

Clients cannot discover each other, so a small relay is unavoidable. The repo
ships one (`server/watch-together-server.mjs`, Node `ws` only) plus a clean
client architecture, so the app works as soon as a node is reachable. If no node
is configured the screen states it plainly (`watchTogether.serverMissing`) instead
of pretending to sync.

## Configuration

```bash
cp .env.example .env
# address of the sync node; empty means "Watch Together is not configured"
EXPO_PUBLIC_WATCH_TOGETHER_URL=ws://192.168.1.10:8787
```

The app derives the health endpoint by swapping the scheme
(`ws://host:8787` → `http://host:8787/health`). "Copy server address" in the
Watch Together screen copies this value for sharing.

### Running the node

```bash
npm run server:watchtogether            # PORT=8787 HOST=0.0.0.0
PORT=9000 npm run server:watchtogether  # custom port
```

The node prints the listening address and serves `GET /health` →
`{ "ok": true, "rooms": 3, "uptimeSec": 120 }`. Defaults: room TTL 2 h, at most
24 participants, 6-character room codes (A–Z 0–9), host-only playback, host
promoted automatically when the host disconnects, empty rooms dropped.

## Protocol (v1)

JSON frames, one object per WebSocket message. The client and server share the
same names (`src/features/watchtogether/sync/protocol.ts`).

Client → server:

| Frame | Payload | Notes |
| --- | --- | --- |
| `room:create` | `{ roomId, displayName, playback }` | creator becomes host |
| `room:join` | `{ roomId, displayName }` | `roomId` is the 6-char code |
| `playback:play` | `{ positionSec }` | host only |
| `playback:pause` | `{ positionSec }` | host only |
| `playback:seek` | `{ positionSec }` | host only |
| `playback:rate` | `{ rate }` | host only, clamped 0.85–1.15 |
| `playback:episode` | `{ episodeId, episodeOrdinal, titleId, positionSec }` | host only |
| `chat:message` | `{ text }` | max 500 characters, last 200 kept |
| `ping` | `{}` | every 15 s |

Server → client:

| Frame | Payload |
| --- | --- |
| `room:state` | `{ roomId, code, role, participants, playback, messages }` |
| `room:playback` | `SyncPlaybackState` |
| `room:participants` | `Participant[]` |
| `room:chat` | `ChatMessage` |
| `room:error` | `{ code, message }` — `room_not_found`, `room_full`, `not_in_room`, `invalid_frame` |

Malformed frames are ignored by both sides (`decode` returns `null`), so a bad
payload can never crash the app.

## Sync behaviour

`sync/syncEngine.ts` is pure and unit-tested:

- `projectPosition(state, now)` extrapolates the host position while playing.
- `evaluateDrift(local, remote)` → `none | nudge | seek | play | pause | episode-change`.
- Tolerance is 0.12 s. Below the 2.5 s seek threshold the guest is nudged
  gradually (rate delta ≥ 0.05, clamped to 0.85–1.15); only a larger difference
  causes a hard seek. Play/pause and episode changes follow the host immediately.
- Guests never broadcast playback; their controls are disabled in the UI.
- The correction loop runs once per second, so a room of viewers does not hammer
  the node or the device.

In a room the player persists progress locally as usual, and shared sessions are
recorded for statistics and achievements.

## Testing

`__tests__/syncEngine.test.ts` covers projection, tolerances, nudging, hard
seeks, play/pause, episode changes and rate clamping;
`__tests__/watchTogetherServer.test.ts` starts the real node, creates a room,
joins from a second client and asserts that play/pause/seek/episode/chat frames
propagate while guest requests are ignored, that `/health` answers, that an
unknown code reports `room_not_found`, and that the host is promoted on
disconnect.

## Backend integration checklist for production

1. Deploy `server/watch-together-server.mjs` behind TLS (`wss://`) — reverse
   proxy (nginx/Caddy) or a managed WebSocket host.
2. Set `EXPO_PUBLIC_WATCH_TOGETHER_URL=wss://sync.example.com` in the EAS build
   profile; no secrets are needed by the client.
3. Optional, not implemented on purpose: durable rooms, accounts, moderation.
   The protocol is versioned, so a server can add frames without breaking
   installed clients.
