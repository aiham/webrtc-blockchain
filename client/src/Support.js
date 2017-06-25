const canCrypto = () => (
  window.crypto &&
  window.crypto.subtle &&
  window.crypto.subtle.generateKey
);

const canStorage = () => {
  try {
    return !!window.localStorage;
  } catch (e) {
    return false;
  }
};

export default { canCrypto, canStorage };
