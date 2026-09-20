export type Constructor<T, Args extends unknown[] = unknown[]> = {
  new (...args: Args): T;
};
