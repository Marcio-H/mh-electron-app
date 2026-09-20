import { Constructor } from '../../../base/functional.api';
import { createServiceIdentifierDecorator } from './instantiation.util';

// #region compiler symbols

export declare const DI_REGISTRY: unique symbol;

// #endregion

export const IInstantiationService =
  createServiceIdentifierDecorator<IInstantiationService>(
    Symbol('instantiationService')
  );

export const CONFIGURATION_REGISTRY = Symbol('configurationRegistry');

// #region interface

export interface IInstantiationService extends BrandedService {
  createInstance<T, Args extends unknown[]>(token: InjectionToken<T, Args>): T;
  createInstance<T, Args extends unknown[]>(
    constructor: Constructor<T, Args>,
    ...args: GetLeadingNonServiceArgs<Args>
  ): T;

  invokeFunction<R, TS extends unknown[] = []>(
    fn: (accessor: IServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R;
}

export interface IServicesAccessor {
  get<T, Args extends unknown[]>(id: InjectionToken<T, Args>): T;
}

export interface IServiceIdentifier<T> {
  (...args: unknown[]): void;
  token: InjectionToken<T, unknown[]>;
  type: T;
}

export interface IRegistrationOptions {
  lifecycle: InstantiationLyfecycle;
}

export interface IClassProvider<T> {
  useClass: Constructor<T, never[]>;
}

export interface ITokenProvider<T> {
  useToken: InjectionToken<T, unknown[]>;
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

export type InjectionToken<T, Args extends unknown[]> =
  Constructor<T, Args> | string | symbol;

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
