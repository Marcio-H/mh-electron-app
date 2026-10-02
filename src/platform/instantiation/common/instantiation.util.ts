import { Constructor } from '../../../base/functional.api';
import { SyncDescriptor } from './descriptors';
import type {
  BrandedService,
  DIRegistry,
  IServiceCollection,
  IServiceIdentifier,
  ServiceDependency,
  ServiceEntry,
  SignedRegistry
} from './instantiation.api';
import { ServiceCollection } from './service-collection';

const serviceIdentifiers = new Map<
  string | symbol,
  IServiceIdentifier<unknown>
>();

const DI_TARGET = Symbol('di.target');

const DI_DEPENDENCIES = Symbol('di.dependencies');

interface DI_TARGET_OBJ extends Constructor<unknown, never[]> {
  [DI_TARGET]?: Constructor<unknown, never[]>;
  [DI_DEPENDENCIES]?: ServiceDependency[];
}

export function createServiceIdentifierDecorator<T extends BrandedService>(
  name: string | symbol
): IServiceIdentifier<T> {
  const existing = serviceIdentifiers.get(name);

  if (existing) {
    return existing as IServiceIdentifier<T>;
  }

  const decorator = function (
    target: DI_TARGET_OBJ,
    _key: string | symbol | undefined,
    index: number
  ): void {
    if (arguments.length !== 3) {
      throw new Error(
        `@${String(name)} can only be used to decorate a constructor parameter`
      );
    }

    storeServiceDependency(decorator, target, index);
  } as IServiceIdentifier<T>;

  decorator.toString = () => String(name);

  serviceIdentifiers.set(name, decorator);

  return decorator;
}

export function getServiceDependencies(
  ctor: DI_TARGET_OBJ
): ServiceDependency[] {
  return ctor[DI_DEPENDENCIES] || [];
}

export function createRegistration<T>(config: DIRegistry<T>): SignedRegistry {
  return config as SignedRegistry;
}

export function registry(
  configurations: SignedRegistry[] = []
): Constructor<IServiceCollection, []> {
  return class extends ServiceCollection {
    constructor() {
      super();

      for (const config of configurations) {
        this.set(config.serviceIdentifier, toServiceEntry(config));
      }
    }
  };
}

function storeServiceDependency(
  id: IServiceIdentifier<unknown>,
  target: DI_TARGET_OBJ,
  index: number
): void {
  const dependencies =
    target[DI_TARGET] === target ? (target[DI_DEPENDENCIES] ?? []) : [];

  dependencies.push({ id, index });

  target[DI_DEPENDENCIES] = dependencies;
  target[DI_TARGET] = target;
}

function toServiceEntry<T>(config: DIRegistry<T>): ServiceEntry<T> {
  if ('useClass' in config) {
    return new SyncDescriptor(
      config.useClass,
      [],
      config.options?.lifecycle,
      config.options?.supportsDelayedInstantiation
    );
  }

  return config.useValue;
}
