import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';

const PORT = process.env.PORT || 8080;
const app = express();
app.use(cors());
app.get('/health', (_, res) => res.json({ ok: true }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const waitingQueue = [];
const peers = new Map();
let idCounter = 1;

function send(ws, type, payload = {}){ if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...payload })); }
function pair(a, b){ peers.get(a).partner = b; peers.get(b).partner = a; peers.get(a).status = 'paired'; peers.get(b).status = 'paired'; const aid = peers.get(a).id; const bid = peers.get(b).id; send(a, 'paired', { partnerId: bid }); send(b, 'paired', { partnerId: aid }); }

function tryMatch(ws){ whi
