import CryptoHelper from './CryptoHelper.js';

const publicKeys = {};

const getKey = (walletId, publicKeyData) => {
  if (publicKeys[walletId]) {
    return Promise.resolve(publicKeys[walletId]);
  }

  return CryptoHelper.import(publicKeyData, false)
    .then(publicKey => {
      publicKeys[walletId] = publicKey;
      return publicKey;
    });
};

export default { getKey };
