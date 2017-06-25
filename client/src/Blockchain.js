import Wallet from './Wallet.js';
import RTC from './RTC.js';
import Support from './Support.js';
import Blocks from './Blocks.js';

const walletIds = {};
const peerIds = {};
const listeners = [];

const trigger = event => {
  listeners.forEach(listener => listener(event));
};

const listen = callback => {
  listeners.push(callback);
  return () => {
    listeners.splice(listeners.indexOf(callback), 1);
  };
};

const getPeers = () => (
  Object.keys(peerIds).map(peerId => ({
    peerId,
    walletId: peerIds[peerId],
  }))
);

const onRTC = event => {
  switch (event.type) {
    case 'dataChannelOpen':
      RTC.send(event.id, { type: 'walletIdRequest' });
      break;

    case 'dataChannelClose':
      delete peerIds[event.id];
      Object.keys(walletIds)
        .filter(walletId => walletIds[walletId] === event.id)
        .forEach(walletId => {
          delete walletIds[walletId];
        });
      trigger({ type: 'peers', peers: getPeers() });
      break;

    case 'message':
      const { from, data } = event.message;
      switch (data.type) {
        case 'transaction':
          break;

        case 'walletIdRequest':
          Wallet.getId().then(walletId => (
            RTC.send(from, { type: 'walletIdResponse', walletId })
          ));
          break;

        case 'walletIdResponse':
          peerIds[from] = data.walletId;
          walletIds[data.walletId] = from;
          trigger({ type: 'peers', peers: getPeers() });
          break;

        default:
          break;
      }
      break;

    default:
      break;
  }
};

const init = () => {
  if (!Support.canCrypto() || !Support.canStorage()) {
    throw new Error('Unsupported browser. This app requires crypto.subtle and localStorage');
  }

  return Promise.all([
    Wallet.getId(),
    Blocks.getBlocks(),
  ]).then(() => {
    RTC.init();
    RTC.listen(onRTC);
  });
};

const addTransaction = transaction => {
  RTC.broadcast({ type: 'transaction', transaction });
};

export default { init, listen, addTransaction };
