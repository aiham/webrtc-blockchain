const canCrypto = () => (
  window.crypto &&
  window.crypto.subtle &&
  window.crypto.subtle.generateKey &&
  window.crypto.subtle.importKey &&
  window.crypto.subtle.exportKey &&
  window.crypto.subtle.verify &&
  window.crypto.subtle.sign &&
  window.crypto.subtle.digest
);

const canStorage = () => {
  try {
    return !!window.localStorage;
  } catch (e) {
    return false;
  }
};

const canRTC = () => (
  window.RTCPeerConnection &&
  window.RTCSessionDescription &&
  window.RTCIceCandidate
);

export default { canCrypto, canStorage, canRTC };
