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
      return this.createInstanceOf(
        ctorOrDescriptor.ctor,
        ctorOrDescriptor.staticArguments.concat(args)
      );
    }

    return this.createInstanceOf(ctorOrDescriptor, args);
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

          const service = this.getOrCreateServiceInstance(id);

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

  private createInstanceOf<T>(
    ctor: Constructor<T, never[]>,
    args: unknown[]
  ): T {
    const dependencies = [...getServiceDependencies(ctor)].sort(
      (a, b) => a.index - b.index
    );
    const firstServiceArgPos = dependencies.length
      ? dependencies[0].index
      : args.length;

    if (args.length !== firstServiceArgPos) {
      throw new Error(
        `[createInstance] ${ctor.name} expects ${firstServiceArgPos} leading non-service argument(s) but received ${args.length}`
      );
    }

    const serviceArgs = dependencies.map((dependency, position) => {
      if (dependency.index !== firstServiceArgPos + position) {
        throw new Error(
          `[createInstance] ${ctor.name} has a service parameter at index ${dependency.index} before a non-service parameter`
        );
      }

      const service = this.getOrCreateServiceInstance(dependency.id);

      if (service === undefined) {
        throw new Error(
          `[createInstance] ${ctor.name} depends on unknown service '${String(dependency.id)}'`
        );
      }

      return service;
    });

    return new ctor(...(args.concat(serviceArgs) as never[]));
  }

  private getOrCreateServiceInstance<T>(
    id: IServiceIdentifier<T>
  ): T | undefined {
    const entry = this.getServiceEntry(id);

    if (entry instanceof SyncDescriptor) {
      return this.createServiceInstance(id, entry);
    }

    return entry;
  }

  private createServiceInstance<T>(
    id: IServiceIdentifier<T>,
    descriptor: SyncDescriptor<T>
  ): T {
    if (this.activeInstantiations.has(id)) {
      const cycle = [...this.activeInstantiations, id].map(String).join(' -> ');

      throw new Error(
        `[createInstance] cyclic dependency between services: ${cycle}`
      );
    }

    this.activeInstantiations.add(id);

    try {
      const instance = this.createInstanceOf(
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
}
