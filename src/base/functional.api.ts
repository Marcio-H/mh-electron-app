export type Constructor<T, Args extends unknown[]> = { new (...args: Args): T };
