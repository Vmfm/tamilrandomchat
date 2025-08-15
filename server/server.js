// server/server.js
// Minimal WebSocket signaling server for random pairing
// Run: npm init -y && npm install ws
//       node server.js

const WebSocket = require('ws');

const port = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port });

console.log(`Signaling server running on ws://0.0.0.0:${port}`);

let waiting = null; // single waiting client

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', (msg) => {
    // messages expected as JSON
    let data;
    try { data = JSON.parse(msg); } catch (e) { return; }

    if (data.type === 'join') {
      // Put the client in waiting, or pair
      if (waiting === null) {
        waiting = ws;
        ws.partner = null;
        ws.send(JSON.stringify({ type: 'waiting' }));
      } else if (waiting === ws) {
        // ignore
      } else {
        // pair waiting and ws
        const a = waiting;
        const b = ws;
        waiting = null;
        a.partner = b;
        b.partner = a;
        const roomMsg = JSON.stringify({ type: 'paired' });
        a.send(roomMsg);
        b.send(roomMsg);
      }
    } else if (data.type === 'signal') {
      // forward signalling payload to partner
      const partner = ws.partner;
      if (partner && partner.readyState === WebSocket.OPEN) {
        partner.send(JSON.stringify({
          type: 'signal',
          payload: data.payload
        }));
      }
    } else if (data.type === 'leave') {
      // notify partner if present
      if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
        ws.partner.send(JSON.stringify({ type: 'peer-left' }));
        ws.partner.partner = null;
      }
      if (waiting === ws) waiting = null;
      ws.partner = null;
    }
  });

  ws.on('close', () => {
    if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
      ws.partner.send(JSON.stringify({ type: 'peer-left' }));
      ws.partner.partner = null;
    }
    if (waiting === ws) waiting = null;
    ws.partner = null;
  });
});

// heartbeat to clean dead sockets
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);
