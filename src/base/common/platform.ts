/**
 * See https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#:~:text=than%204%2C%20then-,set%20timeout%20to%204,-.
 *
 * Works similarly to `setTimeout(0)` but doesn't suffer from the 4ms artificial delay
 * that browsers set when the nesting level is > 5.
 */
export const setTimeout0 = (() => {
  // Node.js env
  if (typeof setImmediate === 'function') {
    return (callback: () => void) => {
      setImmediate(callback);
    };
  }

  // Browser / Render / Web worker env
  if (typeof MessageChannel === 'function') {
    const channel = new MessageChannel();
    const queue: (() => void)[] = [];

    channel.port1.onmessage = () => {
      const task = queue.shift();

      if (task) {
        task();
      }
    };

    return (callback: () => void) => {
      queue.push(callback);
      channel.port2.postMessage(null);
    };
  }

  return (callback: () => void) => setTimeout(callback);
})();
