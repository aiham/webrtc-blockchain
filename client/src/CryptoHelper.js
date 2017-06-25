// https://github.com/diafygi/webcrypto-examples#rsa-pss
// https://blog.engelke.com/tag/webcrypto/

const CryptoHelper = {
  generateKeys: () => window.crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048, // Can be 1024, 2048, or 4096
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 24 bit representation of 65537
      hash: { name: 'SHA-256' }, // Can be 'SHA-1', 'SHA-256', 'SHA-384', or 'SHA-512'
    },
    true, // Whether the key is extractable (i.e. can be used in exportKey)
    ['sign', 'verify'] // Can be any combination of 'sign' and 'verify'
  ),

  sign: (privateKey, data) => window.crypto.subtle.sign(
    {
      name: 'RSA-PSS',
      saltLength: 128, // The length of the salt
    },
    privateKey, // From generateKey or importKey above
    data // ArrayBuffer of data you want to sign
  ).then(signature => new Uint8Array(signature)),

  verify: (publicKey, signature, data) => window.crypto.subtle.verify(
    {
      name: 'RSA-PSS',
      saltLength: 128, // The length of the salt
    },
    publicKey, // From generateKey or importKey above
    signature, // ArrayBuffer of the signature
    data // ArrayBuffer of the data
  ),

  export: (key) => window.crypto.subtle.exportKey('jwk', key),

  import: (key, isPrivate) => window.crypto.subtle.importKey('jwk', key, {
    name: 'RSA-PSS',
    hash: { name: 'SHA-256' },
  }, true, [isPrivate ? 'sign' : 'verify']),
};

export default CryptoHelper;
