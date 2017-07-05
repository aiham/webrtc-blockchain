import Wallet from './Wallet.js';
import Peers from './Peers.js';
import Support from './Support.js';
import Blocks from './Blocks.js';
import Miner from './Miner.js';
import CryptoHelper from './CryptoHelper.js';
import PublicKeys from './PublicKeys.js';
import BytesHex from './BytesHex.js';
import getMax from './getMax.js';
import uuid from 'uuid';

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

const onMinerEvent = event => {
  console.log('Blockchain.onMiner', event);
  switch (event.type) {
    case 'newBlock':
      Wallet.getKeys()
        .then(keys => CryptoHelper.export(keys.publicKey))
        .then(publicKey => {
          Peers.broadcastInfo({
            type: 'newBlock',
            block: event.block,
            publicKey,
          });
        });
      break;

    default:
      break;
  }
};

let chainPromise;
const getMostCommonChain = () => {
  chainPromise = Peers.broadcastRequest({ type: 'chain' })
    .then(results => {
      chainPromise = null;
      const resultValues = Object.keys(results).map(peerId => results[peerId]);
      const headCounts = resultValues.filter(chain => chain && chain.head)
        .reduce((counts, ({ head })) => {
          if (!counts[head]) {
            counts[head] = 0;
          }
          counts[head] += 1;
          return counts;
        }, {});
      const [, head] = getMax(
        Object.keys(headCounts).map(head => [headCounts[head], head]),
        ([count]) => count
      ) || [];
      if (head) {
        const chain = resultValues.find(chain => chain && chain.head === head)
        if (chain) {
          Blocks.setChain(chain);
        }
      }
    }, error => {
      chainPromise = null;
      console.error('Failed to collect chain from peers', error);
    });
};

let chainTimer;
const collectChainIfMissing = () => {
  Blocks.getChain()
    .then(({ head }) => {
      if (chainTimer) {
        clearTimeout(chainTimer);
        chainTimer = null;
      }
      if (!head && !chainPromise) {
        chainTimer = setTimeout(() => {
          chainTimer = null;
          if (!chainPromise) {
            getMostCommonChain();
          }
        }, 5000);
      }
    });
};

const onPeerConnected = (id, ids) => {
  Peers.sendRequest(id, { type: 'walletId' })
    .then(({ walletId }) => {
      peerIds[id] = walletId;
      walletIds[walletId] = id;
      trigger({ type: 'peers', peers: getPeers() });

      collectChainIfMissing();
    }, error => {
      console.error(`Failed to get walletId from peer ${id}`, error);
    });
};

const onPeerDisconnected = (id, ids) => {
  delete peerIds[id];
  Object.keys(walletIds)
    .filter(walletId => walletIds[walletId] === id)
    .forEach(walletId => {
      delete walletIds[walletId];
    });
  trigger({ type: 'peers', peers: getPeers() });
};

const onPeerRequest = ({ id, time, from, request }, respond) => {
  switch (request.type) {
    case 'walletId':
      Wallet.getId().then(walletId => respond({ walletId }));
      break;

    case 'chainHead':
      Blocks.getChain()
        .then(({ head }) => {
          respond({ head });
        });
      break;

    case 'chain':
      Blocks.getChain()
        .then(chain => {
          if (!chain.head) {
            respond({ chain: null });
          } else {
            respond({ chain });
          }
        });
      break;

    default:
      break;
  }
};

const onPeerInfo = ({ id, time, from, info }) => {
  switch (info.type) {
    case 'transaction':
      PublicKeys.getKey(info.transaction.from, info.publicKey)
        .then(() => Miner.addTransaction(info.transaction))
        .catch(error => {
          console.error('Failed to add transaction', error);
        });
      break;

    case 'newBlock':
      PublicKeys.getKey(info.block.minerId, info.publicKey)
        .then(() => Miner.newBlock(info.block))
        .catch(error => {
          console.error('Failed to add new block', error);
        });
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
    Blocks.getChain(),
  ]).then(() => {
    Peers.init();
    Peers.onConnected(onPeerConnected);
    Peers.onDisconnected(onPeerDisconnected);
    Peers.onRequest(onPeerRequest);
    Peers.onInfo(onPeerInfo);
    Miner.listen(onMinerEvent);
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
        Peers.broadcastInfo({
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
