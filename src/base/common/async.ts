import { IDisposable, toDisposable } from './lifecycle';

export interface IIdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

export function runWhenIdle(
  // TODO: IdleApi
  callback: (deadline: IIdleDeadline) => void,
  timeout?: number
): IDisposable {
  if (
    typeof requestIdleCallback === 'function' &&
    typeof cancelIdleCallback === 'function'
  ) {
    const handle = requestIdleCallback(
      callback,
      typeof timeout === 'number' ? { timeout } : undefined
    );

    return toDisposable(() => cancelIdleCallback(handle));
  }

  const handle = setTimeout(() => {
    const end = Date.now() + 15;

    callback({
      didTimeout: true,
      timeRemaining: () => Math.max(0, end - Date.now())
    });
  });

  return toDisposable(() => clearTimeout(handle));
}

export class IdleValue<T> {
  private readonly executor: () => void;

  private readonly handle: IDisposable;

  private didRun = false;

  private result?: T;

  private error?: unknown;

  constructor(executor: () => T) {
    this.executor = () => {
      try {
        this.result = executor();
      } catch (error) {
        this.error = error;
      } finally {
        this.didRun = true;
      }
    };

    this.handle = runWhenIdle(() => this.executor());
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
