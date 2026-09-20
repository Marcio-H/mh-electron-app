import { container } from 'tsyringe';
import {
  ConfigurationRegistry,
  GetLeadingNonServiceArgs,
  IInstantiationService,
  InjectionToken,
  IServicesAccessor
} from './instantiation.api';
import { Constructor } from '../../../base/functional.api';

export class InstantiationService implements IInstantiationService {
  //

  // DI for registry in differents harness
  constructor(_configurationRegistry: ConfigurationRegistry<unknown>) {
    //
  }

  createInstance<T, Args extends unknown[]>(token: InjectionToken<T, Args>): T;
  createInstance<T, Args extends unknown[]>(
    constructor: Constructor<T, Args>,
    ...args: GetLeadingNonServiceArgs<Args>
  ): T;
  createInstance<T, Args extends unknown[]>(
    token: InjectionToken<T, Args>,
    ...args: unknown[]
  ): T {
    if (!args.length) return container.resolve(token);

    const child = container.createChildContainer();

    if (typeof token === 'function' && token.prototype) {
      const paramTypes: never[] =
        Reflect.getMetadata('design:paramtypes', token) || [];

      args.forEach((value, index) => {
        const paramToken = paramTypes[index];

        if (paramToken) {
          child.register(paramToken, { useValue: value });
        }
      });
    }

    return child.resolve(token);
  }

  invokeFunction<R, TS extends unknown[] = []>(
    fn: (accessor: IServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R {
    let _done = false;
    try {
      const accessor: IServicesAccessor = {
        get: <T, Args extends unknown[]>(id: InjectionToken<T, Args>) => {
          if (_done) {
            throw Error(
              'service accessor is only valid during the invocation of its target method'
            );
          }

          return this.createInstance(id);
        }
      };
      return fn(accessor, ...args);
    } finally {
      _done = true;
    }
  }
}
