const { AsyncLocalStorage } = require('node:async_hooks');

if (AsyncLocalStorage && typeof AsyncLocalStorage.snapshot !== 'function') {
  AsyncLocalStorage.snapshot = function () {
    return function (fn, ...args) {
      return fn(...args);
    };
  };
}
if (typeof globalThis !== 'undefined' && globalThis.AsyncLocalStorage && typeof globalThis.AsyncLocalStorage.snapshot !== 'function') {
  globalThis.AsyncLocalStorage.snapshot = AsyncLocalStorage.snapshot;
}
