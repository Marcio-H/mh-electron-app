import { IDisposable } from './lifecycle';
import { setTimeout0 } from './platform';

export interface IIdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

export type IdleApi = Pick<
  typeof globalThis,
  'requestIdleCallback' | 'cancelIdleCallback'
>;

export function runWhenIdle(
  targetWindow: IdleApi,
  callback: (idle: IIdleDeadline) => void,
  timeout?: number
): IDisposable {
  let disposed = false;

  if (
    typeof targetWindow.requestIdleCallback === 'function' &&
    typeof targetWindow.cancelIdleCallback === 'function'
  ) {
    const handle = targetWindow.requestIdleCallback(
      (deadline) => {
        if (!disposed) {
          callback(deadline);
        }
      },
      typeof timeout === 'number' ? { timeout } : undefined
    );

    return {
      dispose() {
        if (!disposed) {
          disposed = true;
          targetWindow.cancelIdleCallback(handle);
        }
      }
    };
  }

  setTimeout0(() => {
    if (disposed) {
      return;
    }

    const start = Date.now();
    const end = start + 15; // one frame at 64fps
    const deadline: IIdleDeadline = {
      didTimeout: typeof timeout === 'number' && timeout <= 0,
      timeRemaining() {
        return Math.max(0, end - start);
      }
    };

    callback(Object.freeze(deadline));
  });

  return {
    dispose() {
      disposed = true;
    }
  };
}

export function runWhenGlobalIdle(
  callback: (idle: IIdleDeadline) => void,
  timeout?: number
): IDisposable {
  return runWhenIdle(globalThis, callback, timeout);
}

export abstract class AbstractIdleValue<T> {
  private readonly executor: () => void;

  private readonly handle: IDisposable;

  private didRun = false;

  private result?: T;

  private error?: unknown;

  constructor(targetWindow: IdleApi, executor: () => T) {
    this.executor = () => {
      try {
        this.result = executor();
      } catch (err) {
        this.error = err;
      } finally {
        this.didRun = true;
      }
    };

    this.handle = runWhenIdle(targetWindow, () => this.executor());
  }

  dispose(): void {
    this.handle.dispose();
  }

  get value(): T {
    if (!this.didRun) {
      this.handle.dispose();
      this.executor();
    }

    if (this.error) {
      throw this.error;
    }

    return this.result as T;
  }

  get isInitialized(): boolean {
    return this.didRun;
  }
}

/**
 * An `IdleValue` that always uses the current window (which might be throttled or inactive)
 *
 * **Note** that there is `dom.ts#WindowIdleValue` which is better suited when running inside a browser
 * context
 */
export class GlobalIdleValue<T> extends AbstractIdleValue<T> {
  constructor(executor: () => T) {
    super(globalThis, executor);
  }
}
