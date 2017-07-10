import Blocks from './Blocks.js';
import Wallet from './Wallet.js';
import uuid from 'uuid';
import CryptoHelper from './CryptoHelper.js';
import PublicKeys from './PublicKeys.js';
import BytesHex from './BytesHex.js';

const pendingTransactions = [];
const backlog = [];
const listeners = [];

const MINIMUM_FEES = 5;
const HASH_PREFIX_COUNT = 4;
const HASH_PREFIX = '0'.repeat(HASH_PREFIX_COUNT);

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

let isWorking = false;

const totalFees = transactions => (
  transactions.reduce((loot, { transaction }) => loot + transaction.fee, 0)
);

const worthIt = transactions => totalFees(transactions) >= MINIMUM_FEES;

const validateTransactions = transactions => Promise.all(
  transactions.map(({ from, transaction, signature }) => (
    PublicKeys.getKey(from)
      .then(publicKey => {
        const encodedTransaction = new TextEncoder().encode(JSON.stringify(transaction));
        return CryptoHelper.verify(publicKey, BytesHex.hexToBytes(signature), encodedTransaction);
      })
  ))
);

const createBlock = (transactions, previousId) => Promise.all([
  Wallet.getId(),
  Wallet.getKeys(),
])
.then(([ walletId, keys ]) => {
  const now = +new Date();
  const transaction = {
    id: uuid(),
    time: now,
    to: walletId,
    value: totalFees(transactions),
  };
  const encodedTransaction = new TextEncoder().encode(JSON.stringify(transaction));
  return CryptoHelper.sign(keys.privateKey, encodedTransaction)
    .then(BytesHex.bytesToHex)
    .then(signature => ({
      id: uuid(),
      previousId,
      time: now,
      minerId: walletId,
      transactions: transactions.concat({
        from: walletId,
        transaction,
        signature,
      }),
    }));
});

const addProof = block => {
  if (!block.nonce) {
    block.nonce = 0;
  }
  block.nonce += 1;
  const encodedBlock = new TextEncoder().encode(JSON.stringify(block));
  return CryptoHelper.hash(encodedBlock)
    .then(BytesHex.bytesToHex)
    .then(hash => {
      if (hash.substr(0, HASH_PREFIX_COUNT) === HASH_PREFIX) {
        block.proof = hash;
        return block;
      }
      return addProof(block);
    });
};

const addTransaction = (transaction) => {
  if (isWorking) {
    backlog.push(transaction);
    return;
  }

  pendingTransactions.push(transaction);

  if (!worthIt(pendingTransactions)) {
    return;
  }

  isWorking = true;
  validateTransactions(pendingTransactions)
    .then(results => {
      if (!results.every(x => x)) {
        results.map((x, i) => [ pendingTransactions[i], x ])
          .filter(x => !x)
          .forEach(([ transaction ]) => {
            pendingTransactions.splice(pendingTransactions.indexOf(transaction), 1);
          });
        pendingTransactions.push(...backlog);
        backlog.splice(0, backlog.length);
        isWorking = false;
        return;
      }

      return Blocks.getChain()
        .then(({ head }) => createBlock(pendingTransactions, head))
        .then(addProof)
        .then(block => {
          pendingTransactions.splice(0, pendingTransactions.length);
          pendingTransactions.push(...backlog);
          backlog.splice(0, backlog.length);
          isWorking = false;
          trigger({ type: 'newBlock', block });
        });
    })
    .catch(error => {
      console.error('Failed to create block', error);
    });
};

const newBlock = block => {
  const { proof } = block;

  const unprovenBlock = Object.assign({}, block);
  delete unprovenBlock.proof;

  const encodedBlock = new TextEncoder().encode(JSON.stringify(unprovenBlock));
  return CryptoHelper.hash(encodedBlock)
    .then(BytesHex.bytesToHex)
    .then(hash => {
      if (hash !== proof) {
        throw new Error(`Received block has proof ${proof} that doesn't match hash ${hash}`);
      }

      if (proof.substr(0, HASH_PREFIX_COUNT) !== HASH_PREFIX) {
        throw new Error(`Received block has invalid proof ${proof}`);
      }

      // TODO - More verification of block

      // TODO - Add it to the chain
    });
};

export default { addTransaction, newBlock, listen };
