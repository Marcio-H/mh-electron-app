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

export interface INodeProcess {
  platform: string;
  versions?: { node?: string };
}

declare const process: INodeProcess;

let _isWindows = false;
let _isMacintosh = false;
let _isLinux = false;
let _isIOS = false;

let nodeProcess: INodeProcess | undefined = undefined;

if (
  typeof process !== 'undefined' &&
  typeof process?.versions?.node === 'string'
) {
  nodeProcess = process;
}

if (typeof nodeProcess === 'object') {
  _isWindows = nodeProcess.platform === 'win32';
  _isMacintosh = nodeProcess.platform === 'darwin';
  _isLinux = nodeProcess.platform === 'linux';
} else if (typeof navigator === 'object') {
  const userAgent = navigator.userAgent;
  _isWindows = userAgent.indexOf('Windows') >= 0;
  _isMacintosh = userAgent.indexOf('Macintosh') >= 0;
  _isIOS =
    (userAgent.indexOf('Macintosh') >= 0 ||
      userAgent.indexOf('iPad') >= 0 ||
      userAgent.indexOf('iPhone') >= 0) &&
    !!navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 0;
  _isLinux = userAgent.indexOf('Linux') >= 0;
} else {
  console.error('Unable to resolve platform.');
}

export const isWindows = _isWindows;
export const isMacintosh = _isMacintosh;
export const isLinux = _isLinux;
export const isIOS = _isIOS;

export enum OperatingSystem {
  Windows = 1,
  Macintosh = 2,
  Linux = 3
}

export const OS =
  _isMacintosh || _isIOS
    ? OperatingSystem.Macintosh
    : _isWindows
      ? OperatingSystem.Windows
      : OperatingSystem.Linux;

export const EOL = _isWindows ? '\r\n' : '\n';
