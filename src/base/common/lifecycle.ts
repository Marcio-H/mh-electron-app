export interface IDisposable {
  dispose(): void;
}

export function toDisposable(fn: () => void): IDisposable {
  return new FunctionDisposable(fn);
}

class FunctionDisposable implements IDisposable {
  private disposed: boolean;
  private readonly fn: () => void;

  constructor(fn: () => void) {
    this.disposed = false;
    this.fn = fn;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.fn();
  }
}
