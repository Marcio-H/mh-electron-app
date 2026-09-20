import { Constructor } from '../../../base/functional.api';
import { InstantiationLifecycle } from './instantiation.api';

export class SyncDescriptor<T> {
  constructor(
    readonly ctor: Constructor<T, never[]>,
    readonly staticArguments: unknown[] = [],
    readonly lifecycle: InstantiationLifecycle = InstantiationLifecycle.Singleton
  ) {}
}
