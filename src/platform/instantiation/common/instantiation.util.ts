import { inject, registry as tsyringeRegistry } from 'tsyringe';
import {
  InjectionToken,
  CONFIGURATION_REGISTRY,
  IServiceIdentifier,
  DIRegistry,
  SignedRegistry
} from './instantiation.api';
import { Constructor } from '../../../base/functional.api';

export function createServiceIdentifierDecorator<T>(
  token: InjectionToken<T>
): IServiceIdentifier<T> {
  const decorator = function (
    target: Constructor<T>,
    key: undefined,
    index: number
  ) {
    inject(token)(target, key, index);
  };

  Object.defineProperty(decorator, 'token', { value: token, writable: false });

  return decorator as IServiceIdentifier<T>;
}

export function createRegistration<T>(config: DIRegistry<T>): SignedRegistry {
  return config as never;
}

export function registry<TARGET_CLASS extends Constructor<unknown>>(
  configurations?: SignedRegistry[]
): (
  target: TARGET_CLASS
) => Constructor<
  InstanceType<TARGET_CLASS> & { [CONFIGURATION_REGISTRY]: true }
> {
  return (target: TARGET_CLASS) => {
    Object.defineProperty(target.prototype, CONFIGURATION_REGISTRY, {
      value: true,
      writable: false
    });

    const registrations = configurations?.map((config) => {
      return { ...config, token: config.serviceIdentifier.token };
    });

    tsyringeRegistry(registrations as never)(target);

    return target as never;
  };
}
