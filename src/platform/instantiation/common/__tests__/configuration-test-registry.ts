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

// #region DIAMOND TEST

export const IDiamondSharedService =
  createServiceIdentifierDecorator<IDiamondSharedService>(
    'diamondSharedService'
  );

export const IDiamondLeftService =
  createServiceIdentifierDecorator<IDiamondLeftService>('diamondLeftService');

export const IDiamondRightService =
  createServiceIdentifierDecorator<IDiamondRightService>('diamondRightService');

export const IDiamondTopService =
  createServiceIdentifierDecorator<IDiamondTopService>('diamondTopService');

export interface IDiamondSharedService extends BrandedService {
  ping(): string;
}

export interface IDiamondLeftService extends BrandedService {
  readonly sharedService: IDiamondSharedService;
}

export interface IDiamondRightService extends BrandedService {
  readonly sharedService: IDiamondSharedService;
}

export interface IDiamondTopService extends BrandedService {
  readonly leftService: IDiamondLeftService;
  readonly rightService: IDiamondRightService;
}

export class DiamondSharedService implements IDiamondSharedService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  ping(): string {
    return 'pong';
  }
}

export class DiamondLeftService implements IDiamondLeftService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @IDiamondSharedService public readonly sharedService: IDiamondSharedService
  ) {}
}

export class DiamondRightService implements IDiamondRightService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @IDiamondSharedService public readonly sharedService: IDiamondSharedService
  ) {}
}

export class DiamondTopService implements IDiamondTopService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @IDiamondLeftService public readonly leftService: IDiamondLeftService,
    @IDiamondRightService public readonly rightService: IDiamondRightService
  ) {}
}

export const DiamondRegistry = registry([
  createRegistration({
    serviceIdentifier: IDiamondSharedService,
    useClass: DiamondSharedService,
    options: { lifecycle: InstantiationLifecycle.Transient }
  }),
  createRegistration({
    serviceIdentifier: IDiamondLeftService,
    useClass: DiamondLeftService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: IDiamondRightService,
    useClass: DiamondRightService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: IDiamondTopService,
    useClass: DiamondTopService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion DIAMOND TEST

// #region CIRCULAR TEST

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

// #region CIRCULAR LIFECYCLE TEST

export const TransientCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: ICircularDependencyA,
    useClass: CircularDependencyA,
    options: { lifecycle: InstantiationLifecycle.Transient }
  }),
  createRegistration({
    serviceIdentifier: ICircularDependencyB,
    useClass: CircularDependencyB,
    options: { lifecycle: InstantiationLifecycle.Transient }
  })
]);

export const MixedLifecycleCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: ICircularDependencyA,
    useClass: CircularDependencyA,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: ICircularDependencyB,
    useClass: CircularDependencyB,
    options: { lifecycle: InstantiationLifecycle.Transient }
  })
]);

export const DelayedCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: ICircularDependencyA,
    useClass: CircularDependencyA,
    options: {
      lifecycle: InstantiationLifecycle.Singleton,
      supportsDelayedInstantiation: true
    }
  }),
  createRegistration({
    serviceIdentifier: ICircularDependencyB,
    useClass: CircularDependencyB,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion CIRCULAR LIFECYCLE TEST

// #region SELF CIRCULAR TEST

export const ISelfCircularService =
  createServiceIdentifierDecorator<ISelfCircularService>('selfCircularService');

export interface ISelfCircularService extends BrandedService {
  readonly self: ISelfCircularService;
}

export class SelfCircularService implements ISelfCircularService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @ISelfCircularService public readonly self: ISelfCircularService
  ) {}
}

export const SelfCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: ISelfCircularService,
    useClass: SelfCircularService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion SELF CIRCULAR TEST

// #region LONG CIRCULAR TEST

export const ILongCircularA =
  createServiceIdentifierDecorator<ILongCircularA>('longCircularA');

export const ILongCircularB =
  createServiceIdentifierDecorator<ILongCircularB>('longCircularB');

export const ILongCircularC =
  createServiceIdentifierDecorator<ILongCircularC>('longCircularC');

export interface ILongCircularA extends BrandedService {
  readonly circularB: ILongCircularB;
}

export interface ILongCircularB extends BrandedService {
  readonly circularC: ILongCircularC;
}

export interface ILongCircularC extends BrandedService {
  readonly circularA: ILongCircularA;
}

export class LongCircularA implements ILongCircularA {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(@ILongCircularB public readonly circularB: ILongCircularB) {}
}

export class LongCircularB implements ILongCircularB {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(@ILongCircularC public readonly circularC: ILongCircularC) {}
}

export class LongCircularC implements ILongCircularC {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(@ILongCircularA public readonly circularA: ILongCircularA) {}
}

export const LongCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: ILongCircularA,
    useClass: LongCircularA,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: ILongCircularB,
    useClass: LongCircularB,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: ILongCircularC,
    useClass: LongCircularC,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion LONG CIRCULAR TEST

// #region PREFIXED CIRCULAR TEST

export const ICircularPrefixService =
  createServiceIdentifierDecorator<ICircularPrefixService>(
    'circularPrefixService'
  );

export interface ICircularPrefixService extends BrandedService {
  readonly circularDependencyA: ICircularDependencyA;
}

export class CircularPrefixService implements ICircularPrefixService {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @ICircularDependencyA
    public readonly circularDependencyA: ICircularDependencyA
  ) {}
}

export const PrefixedCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: ICircularPrefixService,
    useClass: CircularPrefixService,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
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

// #endregion PREFIXED CIRCULAR TEST

// #region DYNAMIC CIRCULAR TEST

export const IDynamicCircularA =
  createServiceIdentifierDecorator<IDynamicCircularA>('dynamicCircularA');

export const IDynamicCircularB =
  createServiceIdentifierDecorator<IDynamicCircularB>('dynamicCircularB');

export interface IDynamicCircularA extends BrandedService {
  readonly circularB: IDynamicCircularB;
  ping(): string;
}

export interface IDynamicCircularB extends BrandedService {
  readonly circularA: IDynamicCircularA;
}

export class DynamicCircularA implements IDynamicCircularA {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  static created = 0;

  readonly circularB: IDynamicCircularB;

  constructor(
    @IInstantiationService instantiationService: IInstantiationService
  ) {
    DynamicCircularA.created++;

    this.circularB = instantiationService.invokeFunction((accessor) =>
      accessor.get(IDynamicCircularB)
    );
  }

  ping(): string {
    return 'pong';
  }
}

export class DynamicCircularB implements IDynamicCircularB {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @IDynamicCircularA public readonly circularA: IDynamicCircularA
  ) {}
}

export class ReentrantDynamicCircularB implements IDynamicCircularB {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(@IDynamicCircularA public readonly circularA: IDynamicCircularA) {
    circularA.ping();
  }
}

export const DynamicCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: IDynamicCircularA,
    useClass: DynamicCircularA,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: IDynamicCircularB,
    useClass: DynamicCircularB,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

export const LazyCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: IDynamicCircularA,
    useClass: DynamicCircularA,
    options: {
      lifecycle: InstantiationLifecycle.Singleton,
      supportsDelayedInstantiation: true
    }
  }),
  createRegistration({
    serviceIdentifier: IDynamicCircularB,
    useClass: DynamicCircularB,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

export const ReentrantLazyCircularRegistry = registry([
  createRegistration({
    serviceIdentifier: IDynamicCircularA,
    useClass: DynamicCircularA,
    options: {
      lifecycle: InstantiationLifecycle.Singleton,
      supportsDelayedInstantiation: true
    }
  }),
  createRegistration({
    serviceIdentifier: IDynamicCircularB,
    useClass: ReentrantDynamicCircularB,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion DYNAMIC CIRCULAR TEST

// #region SCOPED CIRCULAR TEST

export const IScopedCircularOwner =
  createServiceIdentifierDecorator<IScopedCircularOwner>('scopedCircularOwner');

export const IScopedCircularDependency =
  createServiceIdentifierDecorator<IScopedCircularDependency>(
    'scopedCircularDependency'
  );

export interface IScopedCircularOwner extends BrandedService {
  readonly dependency: IScopedCircularDependency;
}

export interface IScopedCircularDependency extends BrandedService {
  scope(): string;
}

export class ScopedCircularOwner implements IScopedCircularOwner {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @IScopedCircularDependency
    public readonly dependency: IScopedCircularDependency
  ) {}
}

export class RootScopedCircularDependency implements IScopedCircularDependency {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  scope(): string {
    return 'root';
  }
}

export class ChildScopedCircularDependency implements IScopedCircularDependency {
  //

  // brand
  declare readonly _serviceBrand: undefined;

  constructor(
    @IScopedCircularOwner public readonly owner: IScopedCircularOwner
  ) {}

  scope(): string {
    return 'child';
  }
}

export const ScopedCircularRootRegistry = registry([
  createRegistration({
    serviceIdentifier: IScopedCircularOwner,
    useClass: ScopedCircularOwner,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  }),
  createRegistration({
    serviceIdentifier: IScopedCircularDependency,
    useClass: RootScopedCircularDependency,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

export const ScopedCircularChildRegistry = registry([
  createRegistration({
    serviceIdentifier: IScopedCircularDependency,
    useClass: ChildScopedCircularDependency,
    options: { lifecycle: InstantiationLifecycle.Singleton }
  })
]);

// #endregion SCOPED CIRCULAR TEST

// #endregion CIRCULAR TEST

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
