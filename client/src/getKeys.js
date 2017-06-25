import CryptoHelper from './CryptoHelper.js';

let keys;

const getKeys = () => {
  if (keys) {
    console.log('Getting keys from memory...');
    return Promise.resolve(keys);
  }

  if (window.localStorage.keys) {
    console.log('Getting keys from localStorage...');
    const exportedKeys = JSON.parse(window.localStorage.keys);
    return Promise.all([
      CryptoHelper.import(exportedKeys.publicKey, false),
      CryptoHelper.import(exportedKeys.privateKey, true),
    ])
    .then(([ publicKey, privateKey ]) => ({ publicKey, privateKey }))
    .then(_keys => (keys = _keys));
  }

  console.log('Generating keys...');
  return CryptoHelper.generateKeys()
    .then(_keys => {
      keys = _keys;
      return Promise.all([
        CryptoHelper.export(keys.publicKey),
        CryptoHelper.export(keys.privateKey),
      ]);
    })
    .then(([ publicKey, privateKey ]) => ({ publicKey, privateKey }))
    .then(exportedKeys => {
      window.localStorage.keys = JSON.stringify(exportedKeys);
      return keys;
    });
};

export default getKeys;
