// server/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const app = express();
app.get('/health', (_,res)=>res.json({ok:true}));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const waiting = [];
const peers = new Map();
let id = 1;

function send(ws, obj){ if(ws && ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(obj)); }

function pair(a,b){
  peers.get(a).partner = b;
  peers.get(b).partner = a;
  send(a, {type:'paired', partnerId: peers.get(b).id});
  send(b, {type:'paired', partnerId: peers.get(a).id});
}

function tryMatch(ws){
  // clean
  while(waiting.length && waiting[0].readyState !== WebSocket.OPEN) waiting.shift();
  if(waiting.length){
    const other = waiting.shift();
    if(other !== ws) return pair(ws, other);
  }
  peers.get(ws).status = 'waiting';
  waiting.push(ws);
  send(ws, {type:'waiting'});
}

function disconnect(ws){
  const info = peers.get(ws);
  if(!info) return;
  const p = info.partner;
  if(p && peers.has(p)) {
    send(p, {type:'partner-left'});
    peers.get(p).partner = null;
    tryMatch(p);
  }
  peers.delete(ws);
}

wss.on('connection', ws=>{
  peers.set(ws, {id: id++, partner: null, status: 'new'});
  send(ws, {type:'id', id: peers.get(ws).id});

  ws.on('message', msg=>{
    let m; try{ m = JSON.parse(msg); }catch(e){return;}
    const self = peers.get(ws);
    if(!self) return;
    if(m.type === 'find'){ self.partner = null; tryMatch(ws); }
    else if(m.type === 'signal'){
      const p = self.partner;
      if(p && peers.has(p)) send(p, {type:'signal', data: m.data});
    }
  });

  ws.on('close', ()=> disconnect(ws));
  ws.on('error', ()=> disconnect(ws));
});

server.listen(PORT, ()=>console.log(`listening ${PORT}`));
