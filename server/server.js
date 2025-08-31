const express = require('express');
const app = express();
const http = require('http').createServer(app);
const WebSocket = require('ws');

const wss = new WebSocket.Server({ server: http });

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    // Broadcast message to all clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });
});

app.use(express.static('public'));

http.listen(3000, () => {
  console.log('Server is running on port 3000');
});
