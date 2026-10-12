import { GlobalIdleValue } from '../../../base/common/async';
import { EOL } from '../../../base/common/platform';
import { Constructor } from '../../../base/functional.api';
import { SyncDescriptor } from './descriptors';
import {
  GetLeadingNonServiceArgs,
  IInstantiationNode,
  IInstantiationService,
  InstantiationLifecycle,
  IServiceBinding,
  IServiceCollection,
  IServiceIdentifier,
  IServicesAccessor,
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
    private readonly _parent?: IInstantiationNode
  ) {
    this.services.set(IInstantiationService, this);
  }

  get parent(): IInstantiationNode | undefined {
    return this._parent;
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

          return this._getOrCreateServiceInstance(id);
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

  findOwner<T>(id: IServiceIdentifier<T>): IInstantiationNode {
    if (this.services.has(id)) {
      return this;
    }

    if (!this._parent) {
      throw new Error(`unknown service '${id.toString()}'`);
    }

    return this._parent.findOwner(id);
  }

  getBinding<T>(id: IServiceIdentifier<T>): IServiceBinding<T> {
    return this.services.get(id) as IServiceBinding<T>;
  }

  isChildOf(from: IInstantiationNode): boolean {
    let node = this as IInstantiationNode | undefined;

    while (node) {
      if (node.parent === from) return true;
      node = node.parent;
    }

    return false;
  }

  createAndCacheServiceInstance<T>(
    id: IServiceIdentifier<T>,
    ctor: Constructor<T, never[]>,
    args: unknown[] = [],
    transientInstances: TransientInstances,
    lifecycle: InstantiationLifecycle,
    supportsDelayedInstantiation: boolean
  ): T {
    const binding = this.services.get(id);

    if (binding?.value) {
      return binding.value;
    }

    const instance = this._createServiceInstance(
      id,
      ctor,
      args,
      transientInstances,
      supportsDelayedInstantiation
    );

    if (lifecycle == InstantiationLifecycle.Singleton) {
      this.services.save(id, instance);
    }

    return instance;
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
    const node = this.findOwner(id);
    const binding = node.getBinding(id);
    const descriptor = binding.descriptor;
    const instance = binding.value;

    if (instance && node == this) {
      return instance;
    }

    // useValue descriptor
    if (!(descriptor instanceof SyncDescriptor)) {
      return descriptor;
    }

    return this._safeCreateAndCacheServiceInstance(id);
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
    type ResolvedInstance<T> = { instance: T; dependencyOverridden: boolean };

    const visiting = new Set<IServiceIdentifier<unknown>>();
    const resolve = <RT>(
      currId: IServiceIdentifier<RT>
    ): ResolvedInstance<RT> => {
      const node = this.findOwner(currId);
      const binding = node.getBinding(currId);
      const descriptor = binding.descriptor;

      // useValue descriptor
      if (!(descriptor instanceof SyncDescriptor)) {
        return { instance: descriptor, dependencyOverridden: false };
      }

      if (visiting.has(currId)) {
        throw CyclicDependencyError.start(currId);
      }

      visiting.add(currId);

      const holder = new Map<IServiceIdentifier<unknown>, unknown>();
      let dependencyOverridden = false;

      for (const dependency of getServiceDependencies(descriptor.ctor)) {
        const dependencyNode = this.findOwner(dependency.id);
        const dependencyBinding = dependencyNode.getBinding(dependency.id);
        const dependencyEntry = dependencyBinding.descriptor;

        if (node != dependencyNode && !node.isChildOf(dependencyNode)) {
          dependencyOverridden = true;
        }

        if (dependencyEntry instanceof SyncDescriptor) {
          switch (dependencyEntry.lifecycle) {
            case InstantiationLifecycle.Singleton: {
              const result = resolveWithCycleTracking(
                dependency.id,
                dependencyEntry
              );
              dependencyOverridden =
                dependencyOverridden || result.dependencyOverridden;
              break;
            }
            case InstantiationLifecycle.Transient: {
              const result = resolveWithCycleTracking(
                dependency.id,
                dependencyEntry
              );

              holder.set(dependency.id, result.instance);
              dependencyOverridden =
                dependencyOverridden || result.dependencyOverridden;
              break;
            }

            default:
              throw new Error(
                `unknown lifecycle: ${dependencyEntry.lifecycle}`
              );
          }
        }
      }

      const cachedInstance = binding.value;
      const targetNode = dependencyOverridden ? this : node;
      const instance =
        cachedInstance && !dependencyOverridden
          ? cachedInstance
          : targetNode.createAndCacheServiceInstance(
              currId,
              descriptor.ctor,
              descriptor.staticArguments,
              holder,
              descriptor.lifecycle,
              descriptor.supportsDelayedInstantiation
            );

      visiting.delete(currId);
      return { instance, dependencyOverridden: dependencyOverridden };
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
      return resolve(id).instance;
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
    private readonly originId: IServiceIdentifier<unknown>,
    private readonly servicesStack: {
      id: IServiceIdentifier<unknown>;
      descriptor: SyncDescriptor<unknown>;
    }[],
    private cyclicDetected = false
  ) {
    super(
      cyclicDetected
        ? CyclicDependencyError.formatCycle(servicesStack)
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
    if (!services.length) return 'Unknown cyclic dependency error.';

    const [origin, ...dependents] = services;
    const names = [origin, ...dependents.reverse()].map(
      (service) => service.descriptor.ctor.name
    );

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

    if (this.originId == id && this.servicesStack.length) {
      this.cyclicDetected = true;
      return;
    }

    this.servicesStack.push({ id, descriptor });
  }

  static start(id: IServiceIdentifier<unknown>): CyclicDependencyError {
    return new CyclicDependencyError(id, [], false);
  }

  static resolve(err: CyclicDependencyError) {
    return new CyclicDependencyError(err.originId, err.servicesStack, true);
  }
}
