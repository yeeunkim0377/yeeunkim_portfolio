(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HomeReelCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDeck(total, count, random = Math.random, avoid = []) {
    const avoided = new Set(avoid);
    const available = Array.from({ length: total }, (_, index) => index + 1)
      .filter((number) => !avoided.has(number));
    for (let index = available.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
    }
    return available.slice(0, Math.min(count, available.length));
  }

  return { createDeck };
}));
