const getMax = (list, getValue) => (
  list.reduce((max, item) => {
    const value = typeof getValue === 'function' ? getValue(item) : item;
    if (!('value' in max) || value > max.value) {
      max.value = value;
      max.item = item;
    }
    return max;
  }, {}).item
);

export default getMax;
