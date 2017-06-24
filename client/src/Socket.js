import io from 'socket.io-client';

const url = 'https://localhost:8080/';
let socket;

const init = () => {
  console.log(`Connecting to ${url}`);
  socket = io.connect(url);

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

export default { init, signal, listen };
