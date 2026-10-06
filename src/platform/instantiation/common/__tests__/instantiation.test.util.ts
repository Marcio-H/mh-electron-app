import { Constructor } from '../../../../base/functional.api';
import { IServiceCollection, SignedRegistry } from '../instantiation.api';
import { registry } from '../instantiation.util';
import { TestRegistry, TestRegistryKey } from './instantiation.test.api';

export function registryTest(
  configurations: SignedRegistry[] = []
): TestRegistry {
  const BaseRegistry = registry(configurations);

  const key = book.add(BaseRegistry);

  return class extends BaseRegistry {
    static readonly key: TestRegistryKey = key;
  };
}

export function getTestRegistry(
  key: TestRegistryKey
): Constructor<IServiceCollection, []> {
  return book.get(key);
}

class BookTestRegistry {
  private constructor(
    private readonly registrations: Constructor<IServiceCollection, []>[] = []
  ) {}

  add(registry: Constructor<IServiceCollection, []>): TestRegistryKey {
    return this.registrations.push(registry) - 1;
  }

  get(key: TestRegistryKey): Constructor<IServiceCollection, []> {
    const ctor = this.registrations[key];

    if (!ctor) {
      throw new Error(
        `Registry with key '${key}' not found in BookTestRegistry`
      );
    }

    return ctor;
  }

  public static start(): BookTestRegistry {
    return new BookTestRegistry();
  }
}

const book = BookTestRegistry.start();
