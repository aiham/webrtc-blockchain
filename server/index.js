const path = require('path');
const fs = require('fs');
const express = require('express');
const https = require('https');
const helmet = require('helmet');
const cors = require('cors');
const SocketIO = require('socket.io');
const uuid = require('uuid');

const port = process.env.PORT || 8080;
const host = process.env.HOST || undefined;

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key'), 'utf8'),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.crt'), 'utf8'),
}, app);

const io = SocketIO(server, { serveClient: false });

const walletIds = {};

io.on('connection', socket => {
  socket.on('walletId', walletId => {
    if (walletIds[walletId]) {
      socket.emit('duplicateWalletId');
      return;
    }

    const id = uuid();
    walletIds[walletId] = id;

    socket.emit('id', id);

    socket.broadcast.emit('signal', { from: id, type: 'join' });

    socket.on('signal', data => {
      socket.broadcast.emit('signal', Object.assign(data, { from: id }));
    });

    socket.on('disconnect', () => {
      delete walletIds[walletId];
      socket.broadcast.emit('signal', { from: id, type: 'leave' });
    });
  });
});

server.listen(port, host, () => {
  const port = server.address().port;
  const host = server.address().address;
  console.log(`App listening at https://${host}:${port}`);
});
