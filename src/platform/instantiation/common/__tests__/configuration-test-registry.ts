import {
  BrandedService,
  IInstantiationService,
  InstantiationLifecycle
} from '../instantiation.api';
import {
  createRegistration,
  createServiceIdentifierDecorator,
  registry
} from '../instantiation.util';

// #region BASIC TEST

export const ITestService =
  createServiceIdentifierDecorator<ITestService>('testService');

export interface ITestService extends BrandedService {
  foo(): void;
}

export class TestService implements ITestService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  foo(): void {
    throw new Error('Method not implemented.');
  }
}

export class BasicTest {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(@ITestService public readonly testService: TestService) {}
}

export const BasicTestConfigurationTestRegistry = registry([
  createRegistration({
    serviceIdentifier: ITestService,
    useClass: TestService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion BASIC TEST

// #region BASIC CIRCULAR TEST

export const ICircularDependencyA =
  createServiceIdentifierDecorator<ICircularDependencyA>('circularDependencyA');

export const ICircularDependencyB =
  createServiceIdentifierDecorator<ICircularDependencyB>('circularDependencyB');

export interface ICircularDependencyA extends BrandedService {
  barA(): void;
}

export interface ICircularDependencyB extends BrandedService {
  barB(): void;
}

export class CircularTest {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(
    @ICircularDependencyA
    public readonly circularDependencyA: ICircularDependencyA
  ) {}
}

export class CircularDependencyA implements ICircularDependencyA {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(
    @ICircularDependencyB
    public readonly circularDependencyB: ICircularDependencyB
  ) {}

  barA(): void {
    throw new Error('Method not implemented.');
  }
}

export class CircularDependencyB implements ICircularDependencyB {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(
    @ICircularDependencyA
    public readonly circularDependencyA: ICircularDependencyA
  ) {}

  barB(): void {
    throw new Error('Method not implemented.');
  }
}

export const BasicCircularConfigurationTestRegistry = registry([
  createRegistration({
    serviceIdentifier: ICircularDependencyA,
    useClass: CircularDependencyA,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: ICircularDependencyB,
    useClass: CircularDependencyB,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion BASIC CIRCULAR TEST

// #region TRANSIENT SCOPE TEST

export const IScopedService =
  createServiceIdentifierDecorator<IScopedService>('scopedService');

export const ITransientService =
  createServiceIdentifierDecorator<ITransientService>('transientService');

export const IScopeOwnerService =
  createServiceIdentifierDecorator<IScopeOwnerService>('scopeOwnerService');

export interface IScopedService extends BrandedService {
  scope(): string;
}

export interface ITransientService extends BrandedService {
  ping(): void;
}

export interface IScopeOwnerService extends BrandedService {
  readonly scopedService: IScopedService;
  readonly instantiationService: IInstantiationService;
}

export class RootScopedService implements IScopedService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  scope(): string {
    return 'root';
  }
}

export class ChildScopedService implements IScopedService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  scope(): string {
    return 'child';
  }
}

export class TransientService implements ITransientService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  ping(): void {
    throw new Error('Method not implemented.');
  }
}

export class ScopeOwnerService implements IScopeOwnerService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(
    @ITransientService public readonly transientService: ITransientService,
    @IScopedService public readonly scopedService: IScopedService,
    @IInstantiationService
    public readonly instantiationService: IInstantiationService
  ) {}
}

export const TransientScopeRootRegistry = registry([
  createRegistration({
    serviceIdentifier: IScopedService,
    useClass: RootScopedService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: ITransientService,
    useClass: TransientService,
    options: { lifecycle: InstantiationLifecycle.Transient }
  }),
  createRegistration({
    serviceIdentifier: IScopeOwnerService,
    useClass: ScopeOwnerService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

export const TransientScopeChildRegistry = registry([
  createRegistration({
    serviceIdentifier: IScopedService,
    useClass: ChildScopedService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion TRANSIENT SCOPE TEST

// #region DELAYED TRANSIENT TEST

export const IEagerTransientService =
  createServiceIdentifierDecorator<IEagerTransientService>(
    'eagerTransientService'
  );

export const IDelayedTransientService =
  createServiceIdentifierDecorator<IDelayedTransientService>(
    'delayedTransientService'
  );

export const IDelayedOwnerService =
  createServiceIdentifierDecorator<IDelayedOwnerService>('delayedOwnerService');

export interface IEagerTransientService extends BrandedService {
  ping(): string;
}

export interface IDelayedTransientService extends BrandedService {
  ping(): string;
}

export interface IDelayedOwnerService extends BrandedService {
  readonly eagerTransientService: IEagerTransientService;
  readonly delayedTransientService: IDelayedTransientService;
}

export class EagerTransientService implements IEagerTransientService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  static created = 0;

  constructor() {
    EagerTransientService.created++;
  }

  ping(): string {
    return 'pong';
  }
}

export class DelayedTransientService implements IDelayedTransientService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  static created = 0;

  constructor() {
    DelayedTransientService.created++;
  }

  ping(): string {
    return 'pong';
  }
}

export class DelayedOwnerService implements IDelayedOwnerService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  static created = 0;

  constructor(
    @IEagerTransientService
    public readonly eagerTransientService: IEagerTransientService,
    @IDelayedTransientService
    public readonly delayedTransientService: IDelayedTransientService
  ) {
    DelayedOwnerService.created++;
  }
}

export const DelayedTransientRegistry = registry([
  createRegistration({
    serviceIdentifier: IEagerTransientService,
    useClass: EagerTransientService,
    options: { lifecycle: InstantiationLifecycle.Transient }
  }),
  createRegistration({
    serviceIdentifier: IDelayedTransientService,
    useClass: DelayedTransientService,
    options: {
      lifecycle: InstantiationLifecycle.Transient,
      supportsDelayedInstantiation: true
    }
  }),
  createRegistration({
    serviceIdentifier: IDelayedOwnerService,
    useClass: DelayedOwnerService,
    options: {
      lifecycle: InstantiationLifecycle.Singleton,
      supportsDelayedInstantiation: true
    }
  })
]);

// #endregion DELAYED TRANSIENT TEST
