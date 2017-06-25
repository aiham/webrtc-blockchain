import CryptoHelper from './CryptoHelper.js';
import uuid from 'uuid';

let id;
let keys;

const extractWallet = () => {
  console.log('Getting wallet from localStorage...');
  const wallet = JSON.parse(window.localStorage.wallet);
  id = wallet.id;
  return Promise.all([
    CryptoHelper.import(wallet.keys.publicKey, false),
    CryptoHelper.import(wallet.keys.privateKey, true),
  ])
  .then(([ publicKey, privateKey ]) => ({ publicKey, privateKey }))
  .then(_keys => (keys = _keys));
};

const createWallet = () => {
  console.log('Generating keys...');
  return CryptoHelper.generateKeys()
    .then(_keys => {
      id = uuid();
      keys = _keys;
      return Promise.all([
        CryptoHelper.export(keys.publicKey),
        CryptoHelper.export(keys.privateKey),
      ]);
    })
    .then(([ publicKey, privateKey ]) => ({ publicKey, privateKey }))
    .then(exportedKeys => {
      window.localStorage.wallet = JSON.stringify({ id, keys: exportedKeys });
    });
};

const getWallet = () => {
  if (window.localStorage.wallet) {
    return extractWallet();
  }
  return createWallet();
};

const getKeys = () => {
  if (keys) {
    return Promise.resolve(keys);
  }
  return getWallet().then(() => keys);
};

const getId = () => {
  if (id) {
    return Promise.resolve(id);
  }
  return getWallet().then(() => id);
};

export default { getKeys, getId };
