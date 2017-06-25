import io from 'socket.io-client';
import Wallet from './Wallet.js';

const url = 'https://localhost:8080/';
let socket;
let id;

const init = () => {
  console.log(`Connecting to ${url}`);
  socket = io.connect(url);

  socket.once('connect', () => (
    Wallet.getId()
      .then(walletId => socket.emit('walletId', walletId))
  ));

  socket.on('duplicateWalletId', () => {
    Wallet.getId().then(walletId => {
      console.error('Cannot connect multiple peers with same wallet ID', walletId);
      socket.close();
    });
  });

  socket.on('id', _id => (id = _id));

  [
    'connect',
    'connect_error',
    'connect_timeout',
    'error',
    'disconnect',
    'reconnect',
    'reconnect_attempt',
    'reconnecting',
    'reconnect_error',
    'reconnect_failed'
  ].forEach(eventName => {
    socket.on(eventName, () => {
      console.log(`event fired: ${eventName}`, socket);
    });
  });
};

const signal = data => {
  socket.emit('signal', data);
};

const listen = callback => {
  socket.on('signal', callback);
  return () => {
    socket.off('signal', callback);
  };
};

const getId = () => id;

const onReady = callback => {
  if (id) {
    callback(id);
  } else {
    socket.on('id', callback);
  }
};

export default { init, signal, listen, getId, onReady };
