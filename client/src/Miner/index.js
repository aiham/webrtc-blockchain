import Blocks from '../Blocks.js';
import Wallet from '../Wallet.js';
import uuid from 'uuid';
import CryptoHelper from '../CryptoHelper.js';
import PublicKeys from '../PublicKeys.js';
import BytesHex from '../BytesHex.js';
import Tasks from '../Tasks.js';
import validateTransactions from './validateTransactions.js';
import addProof = from './addProof.js';

const pendingTransactions = [];
const backlog = [];
const listeners = [];
const tasks = Tasks.createTaskPool();

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

const totalFees = transactions => (
  transactions.reduce((loot, { transaction }) => loot + transaction.fee, 0)
);

const worthIt = transactions => totalFees(transactions) >= MINIMUM_FEES;

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
        isMinerFee: true,
        transaction,
        signature,
      }),
    }));
});

const maybeCreateBlock = shouldStop => (
  validateTransactions(pendingTransactions)
    .then(results => {
      if (!results.every(x => x)) {
        results.map((x, i) => [ pendingTransactions[i], x ])
          .filter(x => !x)
          .forEach(([ transaction ]) => {
            pendingTransactions.splice(pendingTransactions.indexOf(transaction), 1);
          });
        return;
      }

      if (shouldStop()) {
        return Promise.reject(new Error('maybeCreateBlock stopped'));
      }

      return Blocks.getChain()
        .then(({ head }) => createBlock(pendingTransactions, head))
        .then(block => addProof(block, shouldStop))
        .then(block => {
          if (shouldStop()) {
            return Promise.reject(new Error('maybeCreateBlock stopped'));
          }
          pendingTransactions.splice(0, pendingTransactions.length);
          return block;
        });
    })
    .catch(error => {
      console.error('Failed to create block', error);
    })
);

const moveBacklogToPending = () => {
  pendingTransactions.push(...backlog);
  backlog.splice(0, backlog.length);
};

const addTransaction = (transaction) => {
  if (tasks.hasTaskOfType('createBlock')) {
    backlog.push(transaction);
    return;
  }

  pendingTransactions.push(transaction);

  if (!worthIt(pendingTransactions)) {
    return;
  }

  tasks.addTask('createBlock', maybeCreateBlock).promise
    .then(block => {
      moveBacklogToPending();
      trigger({ type: 'newBlock', block });
    }, err => {
      moveBacklogToPending();
    });
};

const validateBlock = block => {
  const { proof } = block;

  const unprovenBlock = Object.assign({}, block);
  delete unprovenBlock.proof;

  const encodedBlock = new TextEncoder().encode(JSON.stringify(unprovenBlock));
  return CryptoHelper.hash(encodedBlock)
    .then(BytesHex.bytesToHex)
    .then(hash => {
      if (hash !== proof) {
        throw new Error(`Received block has proof ${proof} that doesn't match its hash ${hash}`);
      }

      if (proof.substr(0, HASH_PREFIX_COUNT) !== HASH_PREFIX) {
        throw new Error(`Received block has invalid proof ${proof}`);
      }

      // TODO - More verification of block

      return true;
    });
};

const newBlock = block => {
  return validateBlock(block)
    .then(() => {
      if (isWorking) {
        shouldStopWorking = true;
      }
      // TODO - add it (and any missing ancestors) to our chain
      // TODO - discard any transactions already in the chain
    });
};

const validateChain = chain => {
  const { head, blocks } = chain;
  const remainingBlocks = Object.assign({}, blocks);
  let current = head;
  let promiseChain = Promise.resolve();

  const appendPromiseChain = block => promiseChain.then(() => (
    validateBlock(block)
      .then(isValid => {
        if (!isValid) {
          return Promise.reject(new Error(`Invalid chain: invalid block ${block.id}`));
        }
        return true;
      })
  ));

  while (current && current in remainingBlocks) {
    promiseChain = appendPromiseChain(remainingBlocks[current]);
    current = remainingBlocks[current].previousId;
  }

  promiseChain = promiseChain.then(() => {
    const orphans = Object.keys(remainingBlocks);
    if (orphans.length > 0) {
      return Promise.reject(new Error(`Invalid chain: orphan blocks exist: ${orphans.join(', ')}`));
    }
    return true;
  });

  return promiseChain.catch(err => {
    console.error('Chain validation failed', err);
    return false;
  });
};

export default { addTransaction, newBlock, listen, validateChain };
