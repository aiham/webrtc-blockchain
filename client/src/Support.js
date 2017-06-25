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

const canRTC = () => (
  window.RTCPeerConnection &&
  window.RTCSessionDescription &&
  window.RTCIceCandidate
);

export default { canCrypto, canStorage, canRTC };
