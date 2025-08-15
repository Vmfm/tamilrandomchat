// server/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 8080;
const app = express();
app.use(cors());

// optional health route
app.get('/health', (_, res) => res.json({ ok: true }));

// OPTIONAL: serve static client if you want to host client & server together
// (If you host client on GitHub Pages, you don't need this)
app.use(express.static(path.join(__dirname, '../docs')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// matchmaking state
const waitingQueue = []; // array of ws
const peers = new Map(); // ws -> { id, partner, status }
let idCounter = 1;

function send(ws, type, payload = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...payload }));
  }
}

function pair(a, b) {
  peers.get(a).partner = b;
  peers.get(b).partner = a;
  peers.get(a).status = 'paired';
  peers.get(b).status = 'paired';
  const aid = peers.get(a).id;
  const bid = peers.get(b).id;
  send(a, 'paired', { partnerId: bid });
  send(b, 'paired', { partnerId: aid });
}

function tryMatch(ws) {
  // cleanup dead sockets at queue front
  while (waitingQueue.length && waitingQueue[0].readyState !== WebSocket.OPEN) waitingQueue.shift();

  if (waitingQueue.length) {
    const other = waitingQueue.shift();
    if (other && other !== ws && other.readyState === WebSocket.OPEN) {
      pair(ws, other);
      return;
    }
  }

  // no partner found — enqueue
  if (peers.has(ws)) peers.get(ws).status = 'waiting';
  waitingQueue.push(ws);
  send(ws, 'waiting');
}

function disconnect(ws, reason = 'disconnect') {
  const info = peers.get(ws);
  if (!info) return;
  const partner = info.partner;
  if (partner && peers.has(partner)) {
    send(partner, 'partner-left', { reason });
    // put partner back to queue
    peers.get(partner).partner = null;
    tryMatch(partner);
  }
  peers.delete(ws);
}

wss.on('connection', (ws, req) => {
  const id = idCounter++;
  peers.set(ws, { id, partner: null, status: 'new' });
  send(ws, 'connected', { id });

  ws.on('message', (message) => {
    let msg;
    try { msg = JSON.parse(message); } catch (err) { return; }
    const self = peers.get(ws);
    if (!self) return;

    switch (msg.type) {
      case 'find-partner':
        // if currently paired, notify partner and requeue them
        if (self.partner && peers.has(self.partner)) {
          const partner = self.partner;
          send(partner, 'partner-left', { reason: 'next' });
          peers.get(partner).partner = null;
          tryMatch(partner);
        }
        self.partner = null;
        tryMatch(ws);
        break;

      case 'signal':
        {
          const partner = self.partner;
          if (partner && peers.has(partner)) {
            send(partner, 'signal', { data: msg.data });
          }
        }
        break;

      case 'text':
        {
          const partner = self.partner;
          if (partner && peers.has(partner)) {
            send(partner, 'text', { message: msg.message });
          }
        }
        break;

      case 'leave':
        disconnect(ws, 'leave');
        try { ws.close(); } catch (e) {}
        break;

      default:
        break;
    }
  });

  ws.on('close', () => disconnect(ws, 'close'));
  ws.on('error', () => disconnect(ws, 'error'));
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on :${PORT}`);
});
