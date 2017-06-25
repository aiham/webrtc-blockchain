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
    if (listeners.includes(callback)) {
      listeners.splice(listeners.indexOf(callback), 1);
    }
  };
};

const getPeers = () => (
  Object.keys(peerIds).map(peerId => ({
    peerId,
    walletId: peerIds[peerId],
  }))
);

let awaitingBlocksFrom;
let peersAwaitingBlocks = [];

const onRTC = event => {
  switch (event.type) {
    case 'dataChannelOpen':
      RTC.send(event.id, { type: 'walletIdRequest' });
      Blocks.getBlocks().then(blocks => {
        if (blocks === null && !awaitingBlocksFrom && !peersAwaitingBlocks.includes(event.id)) {
          awaitingBlocksFrom = event.id;
          RTC.send(event.id, { type: 'blocksRequest' });
        }
      });
      break;

    case 'dataChannelClose':
      delete peerIds[event.id];
      Object.keys(walletIds)
        .filter(walletId => walletIds[walletId] === event.id)
        .forEach(walletId => {
          delete walletIds[walletId];
        });
      if (event.id === awaitingBlocksFrom) {
        const peerId = Object.keys(peerIds).find(id => !peersAwaitingBlocks.includes(id));
        if (peerId === undefined) {
          awaitingBlocksFrom = undefined;
        } else {
          awaitingBlocksFrom = peerId;
          RTC.send(peerId, { type: 'blocksRequest' });
        }
      }
      if (peersAwaitingBlocks.includes(event.id)) {
        peersAwaitingBlocks.splice(peersAwaitingBlocks.indexOf(event.id), 1);
      }
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

        case 'blocksRequest':
          Blocks.getBlocks().then(blocks => {
            if (blocks === null) {
              peersAwaitingBlocks.push(from);
            } else {
              RTC.send(from, { type: 'blocksResponse', blocks });
            }
          });
          break;

        case 'blocksResponse':
          awaitingBlocksFrom = undefined;
          peersAwaitingBlocks.forEach(peerId => {
            RTC.send(peerId, { type: 'blocksResponse', blocks: data.blocks });
          });
          peersAwaitingBlocks.splice(0, peersAwaitingBlocks.length);
          Blocks.setBlocks(data.blocks);
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

const addTransaction = ({ to, value, fee }) => (
  Promise.all([
    Wallet.getId(),
    Wallet.getKeys(),
  ])
  .then(([ walletId, keys ]) => (
    CryptoHelper.export(keys.publicKey)
      .then(publicKey => [ walletId, keys, publicKey ])
  ))
  .then(([ walletId, keys, publicKey ]) => {
    const transaction = {
      id: uuid(),
      time: +new Date(),
      from: walletId,
      to,
      value,
      fee,
    };
    const encodedTransaction = new TextEncoder().encode(JSON.stringify(transaction));
    return CryptoHelper.sign(keys.privateKey, encodedTransaction)
      .then(BytesHex.bytesToHex)
      .then(signature => {
        RTC.broadcast({
          type: 'transaction',
          transaction: {
            from: walletId,
            transaction,
            signature,
          },
          publicKey,
        });
      });
  })
  .catch(error => {
    console.error('Failed to broadcast transaction', error);
  })
);

export default { init, listen, addTransaction };
