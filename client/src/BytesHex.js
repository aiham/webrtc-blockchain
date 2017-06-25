// https://stackoverflow.com/a/40031979/545726
const bytesToHex = bytes => (
  Array.prototype.map.call(bytes, x => ('00' + x.toString(16)).slice(-2)).join('')
);

const hexToBytes = hex => {
  const parts = [];
  for (let i = 0; i < hex.length; i += 2) {
    parts.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(parts);
};

export default { bytesToHex, hexToBytes };
