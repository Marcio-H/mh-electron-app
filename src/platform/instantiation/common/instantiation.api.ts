import { Constructor } from '../../../base/functional.api';
import { createServiceIdentifierDecorator } from './instantiation.util';

// #region compiler symbols

export declare const CONFIGURATION_REGISTRY: unique symbol;

export declare const DI_REGISTRY: unique symbol;

// #endregion

export const IInstantiationService =
  createServiceIdentifierDecorator<IInstantiationService>(
    Symbol('instantiationService')
  );

// #region interface

export interface IInstantiationService {
  createInstance<T>(token: InjectionToken<T>): T;

  createInstance<R, C extends Constructor<R>>(
    constructor: C,
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<C>>
  ): R;

  invokeFunction<R, TS extends unknown[] = []>(
    fn: (accessor: IServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R;
}

export interface IServicesAccessor {
  get<T>(id: InjectionToken<T>): T;
}

export interface IServiceIdentifier<T> {
  (...args: unknown[]): void;
  token: InjectionToken<T>;
  type: T;
}

export interface IRegistrationOptions {
  lifecycle: InstantiationLyfecycle;
}

export interface IClassProvider<T> {
  useClass: Constructor<T, never[]>;
}

export interface ITokenProvider<T> {
  useToken: InjectionToken<T>;
}

// #endregion

// #region enum

export enum InstantiationLyfecycle {
  Transient = 0,
  Singleton = 1,
  ResolutionScoped = 2
}

// #endregion

// #region type

export type InjectionToken<T> = Constructor<T> | string | symbol;

export type ConfigurationRegistry<T> = T & { [CONFIGURATION_REGISTRY]: true };

export type DIRegistry<T> = {
  serviceIdentifier: IServiceIdentifier<T>;
  options?: IRegistrationOptions;
} & Provider<T>;

export type SignedRegistry = DIRegistry<unknown> & {
  readonly [DI_REGISTRY]: true;
};

export type Provider<T> = IClassProvider<T> | ITokenProvider<T>;

export type BrandedService = { _serviceBrand: undefined };

export type GetLeadingNonServiceArgs<TArgs extends unknown[]> = TArgs extends [
  ...BrandedService[]
]
  ? []
  : TArgs extends [infer A, ...BrandedService[]]
    ? [A]
    : TArgs extends [infer A, ...infer R]
      ? [A, ...GetLeadingNonServiceArgs<R>]
      : [];

//#endregion
