import { IdleValue } from '../../../base/common/async';
import { Constructor } from '../../../base/functional.api';
import { SyncDescriptor } from './descriptors';
import {
  GetLeadingNonServiceArgs,
  IIInstantiationNode,
  IInstantiationService,
  InstantiationLifecycle,
  IServiceCollection,
  IServiceIdentifier,
  IServicesAccessor,
  ServiceEntry
} from './instantiation.api';
import { getServiceDependencies } from './instantiation.util';
import { ServiceCollection } from './service-collection';

export class InstantiationService
  implements IInstantiationService, IIInstantiationNode
{
  //

  private readonly activeInstantiations = new Set<
    IServiceIdentifier<unknown>
  >();

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    private readonly services: IServiceCollection = new ServiceCollection(),
    private readonly parent?: IIInstantiationNode
  ) {
    this.services.set(IInstantiationService, this);
  }

  createInstance<T>(descriptor: SyncDescriptor<T>): T;
  createInstance<T, Args extends unknown[]>(
    constructor: Constructor<T, Args>,
    ...args: GetLeadingNonServiceArgs<Args>
  ): T;
  createInstance<T>(
    ctorOrDescriptor: Constructor<T, never[]> | SyncDescriptor<T>,
    ...args: unknown[]
  ): T {
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      return this._createInstance(
        ctorOrDescriptor.ctor,
        ctorOrDescriptor.staticArguments.concat(args)
      );
    }

    return this._createInstance(ctorOrDescriptor, args);
  }

  invokeFunction<R, TS extends unknown[] = []>(
    fn: (accessor: IServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R {
    let done = false;

    try {
      const accessor: IServicesAccessor = {
        get: <T>(id: IServiceIdentifier<T>): T => {
          if (done) {
            throw new Error(
              'service accessor is only valid during the invocation of its target method'
            );
          }

          const service = this._getOrCreateServiceInstance(id);

          if (service === undefined) {
            throw new Error(`[invokeFunction] unknown service '${String(id)}'`);
          }

          return service;
        }
      };

      return fn(accessor, ...args);
    } finally {
      done = true;
    }
  }

  createChild(services: IServiceCollection): IInstantiationService {
    return new InstantiationService(services, this);
  }

  getServiceEntry<T>(id: IServiceIdentifier<T>): ServiceEntry<T> | undefined {
    return this.services.get(id) || this.parent?.getServiceEntry(id);
  }

  private _createInstance<T>(
    ctor: Constructor<T, never[]>,
    args: unknown[]
  ): T {
    const serviceDependencies = getServiceDependencies(ctor).sort(
      (a, b) => a.index - b.index
    );
    const serviceArgs = serviceDependencies.map((dependency) => {
      const service = this._getOrCreateServiceInstance(dependency.id);

      if (!service) {
        throw new Error(
          `[createInstance] ${ctor.name} depends on unknown service '${String(dependency.id)}'`
        );
      }

      return service;
    });

    const firstServiceArgPos = serviceDependencies.length
      ? serviceDependencies[0].index
      : args.length;

    // check for argument mismatches, adjust static optional args if needed
    if (args.length !== firstServiceArgPos) {
      console.trace(
        `[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`
      );

      const delta = firstServiceArgPos - args.length;

      if (delta > 0) {
        args = args.concat(new Array(delta));
      } else {
        args = args.slice(0, firstServiceArgPos);
      }
    }

    return Reflect.construct(ctor, args.concat(serviceArgs));
  }

  private _getOrCreateServiceInstance<T>(
    id: IServiceIdentifier<T>
  ): T | undefined {
    const entry = this.getServiceEntry(id);

    if (entry instanceof SyncDescriptor) {
      return this._safeCreateAndCacheServiceInstance(id, entry);
    }

    return entry;
  }

  private _safeCreateAndCacheServiceInstance<T>(
    id: IServiceIdentifier<T>,
    descriptor: SyncDescriptor<T>
  ): T {
    if (this.activeInstantiations.has(id)) {
      throw new Error(
        `illegal state, recursively instantiating service '${String(id)}'`
      );
    }

    this.activeInstantiations.add(id);

    try {
      const instance = this._createInstance(
        descriptor.ctor,
        descriptor.staticArguments
      );

      if (descriptor.lifecycle === InstantiationLifecycle.Singleton) {
        this.services.set(id, instance);
      }

      return instance;
    } finally {
      this.activeInstantiations.delete(id);
    }
  }

  private _createAndCacheServiceInstance<T>(
    id: IServiceIdentifier<T>,
    descriptor: SyncDescriptor<T>
  ): T {
    // TODO: impl
  }
}
