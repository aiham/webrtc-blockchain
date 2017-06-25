let blocks;

const extractBlocks = () => {
  console.log('Getting blocks from localStorage...');
  return JSON.parse(window.localStorage.blocks);
};

const getBlocks = () => {
  if (blocks === undefined) {
    if (window.localStorage.blocks) {
      blocks = extractBlocks();
    } else {
      blocks = null;
    }
  }
  return Promise.resolve(blocks);
};

export default { getBlocks };
