let chain;

const extractChain = () => {
  console.log('Getting chain from localStorage...');
  return JSON.parse(window.localStorage.chain);
};

const getChain = () => {
  if (chain === undefined) {
    if (window.localStorage.chain) {
      chain = extractChain();
    } else {
      chain = {
        head: null,
        blocks: {},
      };
    }
  }
  return Promise.resolve(chain);
};

const getIds = targetId => getChain().then(({ head, blocks }) => {
  const ids = [];
  let current = head;
  while (current && blocks[current]) {
    ids.push(current);
    if (targetId && current === targetId) {
      break;
    }
    current = blocks[current].previousId;
  }
  return ids;
});

const setChain = ({ head, blocks }) => {
  chain = { head, blocks };
  window.localStorage.chain = JSON.stringify(chain);
};

export default { getChain, getIds, setChain };
