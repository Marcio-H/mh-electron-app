import { Constructor } from '../../../base/functional.api';
import type { SyncDescriptor } from './descriptors';
import { createServiceIdentifierDecorator } from './instantiation.util';

// #region compiler symbols

export declare const DI_REGISTRY: unique symbol;

// #endregion

export const IInstantiationService =
  createServiceIdentifierDecorator<IInstantiationService>(
    'instantiationService'
  );

// #region interface

export interface IInstantiationService extends BrandedService {
  createInstance<T>(descriptor: SyncDescriptor<T>): T;
  createInstance<T, Args extends unknown[]>(
    constructor: Constructor<T, Args>,
    ...args: GetLeadingNonServiceArgs<Args>
  ): T;

  invokeFunction<R, TS extends unknown[] = []>(
    fn: (accessor: IServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R;

  createChild(services: IServiceCollection): IInstantiationService;
}

export interface IIInstantiationNode {
  getServiceEntry<T>(id: IServiceIdentifier<T>): ServiceEntry<T> | undefined;
}

export interface IServicesAccessor {
  get<T>(id: IServiceIdentifier<T>): T;
}

export interface IServiceIdentifier<T> {
  (...args: unknown[]): void;
  type: T;
}

export interface IServiceCollection {
  set<T>(id: IServiceIdentifier<T>, entry: ServiceEntry<T>): void;
  get<T>(id: IServiceIdentifier<T>): ServiceEntry<T> | undefined;
  has(id: IServiceIdentifier<unknown>): boolean;
}

export interface IRegistrationOptions {
  lifecycle?: InstantiationLifecycle;
  supportsDelayedInstantiation?: boolean;
}

export interface IClassProvider<T> {
  useClass: Constructor<T, never[]>;
}

export interface IValueProvider<T> {
  useValue: T;
}

// #endregion

// #region enum

export enum InstantiationLifecycle {
  Transient = 0,
  Singleton = 1
}

// #endregion

// #region type

export type ServiceEntry<T> = T | SyncDescriptor<T>;

export type ServiceDependency = {
  id: IServiceIdentifier<unknown>;
  index: number;
};

export type DIRegistry<T> = {
  serviceIdentifier: IServiceIdentifier<T>;
  options?: IRegistrationOptions;
} & Provider<T>;

export type SignedRegistry = DIRegistry<unknown> & {
  readonly [DI_REGISTRY]: true;
};

export type Provider<T> = IClassProvider<T> | IValueProvider<T>;

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
