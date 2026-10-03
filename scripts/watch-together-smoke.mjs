#!/usr/bin/env node
/**
 * Watch Together runtime smoke check.
 *
 * Boots the real relay server in-process, connects two real WebSocket clients,
 * creates a room, joins it, exchanges playback markers and chat, then asserts
 * that both peers converge. Media is never proxied: only state is relayed.
 *
 *   npm run server:smoke
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import WebSocket from 'ws';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SMOKE_PORT ?? 8791);
const URL = `ws://127.0.0.1:${PORT}`;

const server = spawn(process.execPath, [join(here, '..', 'server', 'watch-together-server.mjs')], {
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const out = (line) => process.stdout.write(`${line}\n`);

let failures = 0;
function check(label, condition) {
  if (condition) {
    out(`  ok   ${label}`);
  } else {
    failures += 1;
    out(`  FAIL ${label}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealth(retries = 40) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (response.ok) return response.json();
    } catch {
      // server still booting
    }
    await sleep(120);
  }
  throw new Error('watch-together server did not become healthy');
}

function connect(name) {
  const socket = new WebSocket(URL);
  const inbox = [];
  const waiters = [];
  socket.on('message', (raw) => {
    const message = JSON.parse(String(raw));
    inbox.push(message);
    for (const waiter of waiters.splice(0)) waiter();
  });
  const ready = new Promise((resolve, reject) => {
    socket.on('open', resolve);
    socket.on('error', reject);
  });
  return {
    name,
    socket,
    inbox,
    ready,
    send: (message) => socket.send(JSON.stringify(message)),
    async next(predicate, timeoutMs = 4000) {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const found = inbox.find(predicate);
        if (found) return found;
        if (Date.now() > deadline) throw new Error(`${name}: timed out waiting for a message`);
        await Promise.race([new Promise((resolve) => waiters.push(resolve)), sleep(200)]);
      }
    },
  };
}

async function run() {
  const health = await waitForHealth();
  check('health endpoint answers', health.ok === true);

  const host = connect('host');
  const guest = connect('guest');
  await host.ready;
  await guest.ready;

  host.send({
    type: 'room:create',
    displayName: 'Host',
    playback: { titleId: 'kodik:serial-413', episodeId: 'e1', episodeOrdinal: 1, positionSec: 120, isPlaying: true, rate: 1 },
  });
  const snapshot = await host.next((message) => message.type === 'room:state');
  const code = snapshot.code;
  check('host receives a room code', typeof code === 'string' && code.length >= 4);
  check('host is marked as host', snapshot.role === 'host');

  guest.send({ type: 'room:join', roomId: code, displayName: 'Guest' });
  const guestSnapshot = await guest.next((message) => message.type === 'room:state');
  check('guest joins by room code', guestSnapshot.role === 'guest');
  const participants = await host.next((message) => message.type === 'room:participants' && message.participants.length === 2);
  check('both participants are listed', participants.participants.length === 2);
  check('exactly one host', participants.participants.filter((p) => p.role === 'host').length === 1);

  host.send({ type: 'playback:seek', positionSec: 300 });
  const seeked = await guest.next((message) => message.type === 'playback:state' && message.playback?.positionSec === 300);
  check('seek is relayed to the guest', seeked.playback.positionSec === 300);

  host.send({ type: 'playback:rate', rate: 1.25, positionSec: 300 });
  const rated = await guest.next((message) => message.type === 'playback:state' && message.playback?.rate === 1.25);
  check('rate change is relayed', rated.playback.rate === 1.25);

  host.send({ type: 'episode:change', episodeId: 'e2', episodeOrdinal: 2, titleId: 'kodik:serial-413' });
  const episode = await guest.next((message) => message.type === 'playback:state' && message.playback?.episodeOrdinal === 2);
  check('episode change is relayed and resets position', episode.playback.episodeOrdinal === 2 && episode.playback.positionSec === 0);

  guest.send({ type: 'chat:message', text: 'Синхронно?' });
  const chat = await host.next((message) => message.type === 'chat:message');
  check('chat is relayed', chat.message.text === 'Синхронно?');

  // Guests must not be able to drive playback.
  guest.send({ type: 'playback:seek', positionSec: 9999 });
  await sleep(300);
  check('guest playback commands are ignored', !host.inbox.some((message) => message.playback?.positionSec === 9999));

  guest.socket.close();
  const afterLeave = await host.next((message) => message.type === 'room:participants' && message.participants.length === 1);
  check('leaving updates the roster', afterLeave.participants.length === 1);

  host.socket.send('this is not json');
  const invalid = await host.next((message) => message.type === 'room:error');
  check('malformed frames are reported, not fatal', invalid.code === 'invalid_frame');
  check('server still healthy after bad frames', (await waitForHealth()).ok === true);

  host.socket.close();
}

run()
  .then(() => {
    server.kill('SIGTERM');
    if (failures > 0) {
      out(`\n${failures} check(s) failed`);
      process.exit(1);
    }
    out('\nWatch Together relay verified');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    server.kill('SIGTERM');
    process.exit(1);
  });
