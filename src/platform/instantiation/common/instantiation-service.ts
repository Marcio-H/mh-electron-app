import { GlobalIdleValue } from '../../../base/common/async';
import { EOL } from '../../../base/common/platform';
import { Constructor } from '../../../base/functional.api';
import { SyncDescriptor } from './descriptors';
import {
  GetLeadingNonServiceArgs,
  IInstantiationNode,
  IInstantiationService,
  InstantiationLifecycle,
  IServiceCollection,
  IServiceIdentifier,
  IServicesAccessor,
  ServiceEntry,
  TransientInstances
} from './instantiation.api';
import { getServiceDependencies } from './instantiation.util';
import { ServiceCollection } from './service-collection';

const NO_TRANSIENT_INSTANCES: TransientInstances = new Map();

export class InstantiationService
  implements IInstantiationService, IInstantiationNode
{
  //

  private readonly activeInstantiations = new Set<
    IServiceIdentifier<unknown>
  >();

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    private readonly services: IServiceCollection = new ServiceCollection(),
    private readonly parent?: IInstantiationNode
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

          return service;
        }
      };

      return fn(accessor, ...args);
    } finally {
      done = true;
    }
  }

  createChild(
    services: IServiceCollection
  ): IInstantiationService & IInstantiationNode {
    return new InstantiationService(services, this);
  }

  getServiceEntry<T>(id: IServiceIdentifier<T>): ServiceEntry<T> {
    const entry = this.services.get(id) || this.parent?.getServiceEntry(id);

    if (!entry) {
      throw new Error(`unknown service '${id.toString()}'`);
    }

    return entry;
  }

  createAndCacheServiceInstance<T>(
    id: IServiceIdentifier<T>,
    ctor: Constructor<T, never[]>,
    args: unknown[] = [],
    transientInstances: TransientInstances,
    lifecycle: InstantiationLifecycle,
    supportsDelayedInstantiation: boolean
  ): T {
    const entry = this.services.get(id);

    if (entry instanceof SyncDescriptor) {
      const instance = this._createServiceInstance(
        id,
        ctor,
        args,
        transientInstances,
        supportsDelayedInstantiation
      );

      if (lifecycle == InstantiationLifecycle.Singleton) {
        this.services.set(id, instance);
      }

      return instance;
    } else if (entry) {
      return entry;
    } else if (this.parent) {
      return this.parent.createAndCacheServiceInstance(
        id,
        ctor,
        args,
        transientInstances,
        lifecycle,
        supportsDelayedInstantiation
      );
    } else {
      throw new Error(
        `illegalState - creating UNKNOWN service instance ${ctor.name}`
      );
    }
  }

  set<T>(id: IServiceIdentifier<T>, entry: ServiceEntry<T>): void {
    this.services.set(id, entry);
  }

  private _createInstance<T>(
    ctor: Constructor<T, never[]>,
    args: unknown[],
    transientInstances: TransientInstances = NO_TRANSIENT_INSTANCES
  ): T {
    const serviceDependencies = getServiceDependencies(ctor).sort(
      (a, b) => a.index - b.index
    );
    const serviceArgs = serviceDependencies.map((dependency) => {
      return (
        transientInstances.get(dependency.id) ||
        this._getOrCreateServiceInstance(dependency.id)
      );
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

  private _getOrCreateServiceInstance<T>(id: IServiceIdentifier<T>): T {
    const entry = this.getServiceEntry(id);

    if (entry instanceof SyncDescriptor) {
      return this._safeCreateAndCacheServiceInstance(id);
    }

    return entry;
  }

  private _safeCreateAndCacheServiceInstance<T>(id: IServiceIdentifier<T>): T {
    if (this.activeInstantiations.has(id)) {
      throw new Error(
        `illegal state, recursively instantiating service '${String(id)}'`
      );
    }

    this.activeInstantiations.add(id);

    try {
      return this._createAndCacheServiceInstance(id);
    } finally {
      this.activeInstantiations.delete(id);
    }
  }

  private _createAndCacheServiceInstance<T>(id: IServiceIdentifier<T>): T {
    const visiting = new Set<IServiceIdentifier<unknown>>();
    const resolve = (currId: IServiceIdentifier<unknown>) => {
      const entry = this.getServiceEntry(currId);

      if (!(entry instanceof SyncDescriptor)) return entry;

      if (visiting.has(currId)) {
        throw CyclicDependencyError.start(currId, entry);
      }

      visiting.add(currId);

      const holder = new Map<IServiceIdentifier<unknown>, unknown>();

      for (const dependency of getServiceDependencies(entry.ctor)) {
        const dependencyEntry = this.getServiceEntry(dependency.id);

        if (dependencyEntry instanceof SyncDescriptor) {
          switch (dependencyEntry.lifecycle) {
            case InstantiationLifecycle.Singleton:
              resolveWithCycleTracking(dependency.id, dependencyEntry);
              break;
            case InstantiationLifecycle.Transient:
              holder.set(
                dependency.id,
                resolveWithCycleTracking(dependency.id, dependencyEntry)
              );
              break;
            default:
              throw new Error(`lifecycle ${dependencyEntry.lifecycle} unknow`);
          }
        }
      }

      const instance = this.createAndCacheServiceInstance(
        currId,
        entry.ctor,
        entry.staticArguments,
        holder,
        entry.lifecycle,
        entry.supportsDelayedInstantiation
      );

      visiting.delete(currId);
      return instance;
    };
    const resolveWithCycleTracking = (
      currId: IServiceIdentifier<unknown>,
      descriptor: SyncDescriptor<unknown>
    ) => {
      try {
        return resolve(currId);
      } catch (err) {
        if (err instanceof CyclicDependencyError) {
          err.add(currId, descriptor);
        }

        throw err;
      }
    };

    try {
      return resolve(id);
    } catch (err) {
      if (err instanceof CyclicDependencyError) {
        throw CyclicDependencyError.resolve(err);
      }

      throw err;
    }
  }

  private _createServiceInstance<T>(
    _id: IServiceIdentifier<T>,
    ctor: Constructor<T, never[]>,
    args: unknown[] = [],
    transientInstances: TransientInstances,
    supportsDelayedInstantiation: boolean
  ): T {
    if (!supportsDelayedInstantiation) {
      // eager instantiation
      return this._createInstance(ctor, args, transientInstances);
    } else {
      const idle = new GlobalIdleValue<T & object>(() => {
        return this._createInstance<T>(ctor, args, transientInstances) as T &
          object;
      });

      return <T>new Proxy(Object.create(null), {
        get(
          target: Record<PropertyKey, unknown>,
          key: PropertyKey,
          receiver: unknown
        ): unknown {
          // value already exists
          if (Reflect.has(target, key)) {
            return Reflect.get(target, key, receiver);
          }

          // create value
          const obj = idle.value;
          const property = Reflect.get(obj, key);

          if (typeof property === 'function') {
            const boundFn = property.bind(obj);

            Reflect.set(target, key, boundFn);
            return boundFn;
          }

          return property;
        },

        set(
          _target: Record<PropertyKey, unknown>,
          key: PropertyKey,
          value: unknown
        ): boolean {
          return Reflect.set(idle.value, key, value);
        },

        getPrototypeOf(_target: T) {
          return ctor.prototype;
        }
      });
    }
  }
}

class CyclicDependencyError extends Error {
  //

  private constructor(
    private readonly servicesStack: {
      id: IServiceIdentifier<unknown>;
      descriptor: SyncDescriptor<unknown>;
    }[],
    private cyclicDetected = false
  ) {
    super(
      cyclicDetected
        ? CyclicDependencyError.formatCycle(servicesStack.reverse())
        : 'cyclic dependency between services'
    );
    this.name = 'DI Error';
  }

  private static formatCycle(
    services: {
      id: IServiceIdentifier<unknown>;
      descriptor: SyncDescriptor<unknown>;
    }[]
  ): string {
    const names = services.map((service) => service.descriptor.ctor.name);

    if (names.length <= 1) return 'Unknown cyclic dependency error.';

    const header = `Circular dependency detected between services!`;
    const subheader = `The container failed to resolve the graph due to the following cycle:`;
    const footer = `Hint: Remove the direct dependency.`;

    const flowLines: string[] = Array.from({ length: names.length * 2 - 1 });

    names.forEach((name, index) => {
      if (index === 0) {
        flowLines[index] = `┌→ ${name} (Cycle origin)`;
      } else {
        flowLines[index * 2 - 1] = `│  ↓`;
        flowLines[index * 2] = `│  ${name}`;
      }
    });

    flowLines.push(`│  ↓`);
    flowLines.push(`└─ ${names[0]} (Circular reference back to here ✖)`);

    const flow = flowLines.join(EOL);

    const dedent = (strings: TemplateStringsArray, ...values: string[]) => {
      return strings.reduce(
        (acc, _str, i) => acc + ((values[i] ?? '') + EOL),
        ''
      );
    };

    return dedent`
      ${header}
      ${subheader}

      ${flow}

      ${footer}
    `;
  }

  add(
    id: IServiceIdentifier<unknown>,
    descriptor: SyncDescriptor<unknown>
  ): void {
    if (this.cyclicDetected) {
      return;
    }

    if (this.servicesStack[0].id == id) {
      this.cyclicDetected = true;
    }

    this.servicesStack.push({ id, descriptor });
  }

  static start(
    id: IServiceIdentifier<unknown>,
    descriptor: SyncDescriptor<unknown>
  ): CyclicDependencyError {
    return new CyclicDependencyError([{ id, descriptor }], false);
  }

  static resolve(err: CyclicDependencyError) {
    return new CyclicDependencyError(err.servicesStack, err.cyclicDetected);
  }
}
