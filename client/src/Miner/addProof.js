import CryptoHelper from '../CryptoHelper.js';
import BytesHex from '../BytesHex.js';

const HASH_PREFIX_COUNT = 4;
const HASH_PREFIX = '0'.repeat(HASH_PREFIX_COUNT);

const addProof = (block, shouldStop) => {
  if (!block.nonce) {
    block.nonce = 0;
  }
  block.nonce += 1;
  const encodedBlock = new TextEncoder().encode(JSON.stringify(block));
  return CryptoHelper.hash(encodedBlock)
    .then(BytesHex.bytesToHex)
    .then(hash => {
      if (shouldStop()) {
        return Promise.reject(new Error('addProof stopped'));
      }
      if (hash.substr(0, HASH_PREFIX_COUNT) === HASH_PREFIX) {
        block.proof = hash;
        return block;
      }
      return addProof(block, shouldStop);
    });
};

export default addProof;
