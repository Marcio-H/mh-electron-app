import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test as baseTest,
  vi
} from 'vitest';
import {
  IInstantiationService,
  IServiceCollection
} from '../instantiation.api';
import { InstantiationService } from '../instantiation-service';
import {
  BasicCircularConfigurationTestRegistry,
  BasicTest,
  BasicTestConfigurationTestRegistry,
  ChildScopedService,
  CircularTest,
  DelayedCircularRegistry,
  DelayedOwnerService,
  DelayedTransientRegistry,
  DelayedTransientService,
  DiamondRegistry,
  DiamondSharedService,
  DynamicCircularA,
  DynamicCircularB,
  DynamicCircularRegistry,
  EagerTransientService,
  ICircularDependencyA,
  ICircularPrefixService,
  IDelayedOwnerService,
  IDiamondTopService,
  IDynamicCircularA,
  ILongCircularA,
  IScopeOwnerService,
  IScopedCircularOwner,
  ISelfCircularService,
  ITestService,
  LazyCircularRegistry,
  LongCircularRegistry,
  MixedLifecycleCircularRegistry,
  PrefixedCircularRegistry,
  ReentrantLazyCircularRegistry,
  RootScopedCircularDependency,
  RootScopedService,
  ScopedCircularChildRegistry,
  ScopedCircularRootRegistry,
  ScopeOwnerService,
  SelfCircularRegistry,
  TestService,
  TransientCircularRegistry,
  TransientScopeChildRegistry,
  TransientScopeRootRegistry,
  DeepScopedChildRegistry,
  DiamondTopService,
  ScopedDiamondSharedService,
  IDiamondSharedService,
  IDiamondLeftService,
  IDiamondRightService
} from './configuration-test-registry';
import { TestRegistryKey } from './instantiation.test.api';
import { getTestRegistry } from './instantiation.test.util';

declare module 'vitest' {
  interface TaskMeta {
    rootInstantiationKey?: TestRegistryKey;
    childInstantiationKey?: TestRegistryKey | null;
  }
}

const test = baseTest.extend<{
  rootInstantiationKey: TestRegistryKey;
  childInstantiationKey?: TestRegistryKey | null;
  rootInstantiationRegistry: IServiceCollection;
  childInstantiationRegistry?: IServiceCollection;
}>({
  rootInstantiationKey: BasicTestConfigurationTestRegistry.key,
  rootInstantiationRegistry: async ({ rootInstantiationKey, task }, use) => {
    const rootKey = task.meta.rootInstantiationKey ?? rootInstantiationKey;
    const Ctor = getTestRegistry(rootKey);

    await use(new Ctor());
  },
  childInstantiationKey: undefined,
  childInstantiationRegistry: async ({ childInstantiationKey, task }, use) => {
    const rootKey = task.meta.childInstantiationKey ?? childInstantiationKey;

    if (!rootKey) {
      return await use(undefined);
    }

    const Ctor = getTestRegistry(rootKey);

    await use(new Ctor());
  }
});

describe('instantiation service', () => {
  let instantiationService: IInstantiationService;
  let child: IInstantiationService;

  test.beforeEach(
    ({ childInstantiationRegistry, rootInstantiationRegistry }) => {
      instantiationService = new InstantiationService(
        rootInstantiationRegistry
      );

      child = undefined as never;

      if (childInstantiationRegistry) {
        child = instantiationService.createChild(childInstantiationRegistry);
      }
    }
  );

  test('should create instance with injected services', () => {
    const result = instantiationService.createInstance(BasicTest);

    expect(result).not.toBeNull();
    expect(result.testService).toBeInstanceOf(TestService);
  });

  test('should create instance registered', () => {
    const result = instantiationService.invokeFunction((accessor) =>
      accessor.get(ITestService)
    );

    expect(result).toBeInstanceOf(TestService);
  });

  describe('supportsDelayedInstantiation', () => {
    test.override('rootInstantiationKey', DelayedTransientRegistry.key);

    beforeEach(() => {
      vi.useFakeTimers();

      EagerTransientService.created = 0;
      DelayedTransientService.created = 0;
      DelayedOwnerService.created = 0;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should defer owner construction until first property access', () => {
      const owner = instantiationService.invokeFunction((accessor) =>
        accessor.get(IDelayedOwnerService)
      );

      expect(owner).toBeInstanceOf(DelayedOwnerService);
      expect(DelayedOwnerService.created).toBe(0);

      expect(owner.eagerTransientService).toBeInstanceOf(EagerTransientService);
      expect(DelayedOwnerService.created).toBe(1);
    });

    test('should create transient dependency eagerly even when owner is delayed', () => {
      instantiationService.invokeFunction((accessor) =>
        accessor.get(IDelayedOwnerService)
      );

      expect(EagerTransientService.created).toBe(1);
      expect(DelayedOwnerService.created).toBe(0);
    });

    test('should delay transient dependency registered with supportsDelayedInstantiation', () => {
      const owner = instantiationService.invokeFunction((accessor) =>
        accessor.get(IDelayedOwnerService)
      );

      expect(DelayedTransientService.created).toBe(0);

      expect(owner.delayedTransientService).toBeInstanceOf(
        DelayedTransientService
      );

      expect(DelayedOwnerService.created).toBe(1);
      expect(DelayedTransientService.created).toBe(0);

      expect(owner.delayedTransientService.ping()).toBe('pong');
      expect(DelayedOwnerService.created).toBe(1);
      expect(DelayedTransientService.created).toBe(1);
    });

    test('should construct delayed services on idle without any access', () => {
      instantiationService.invokeFunction((accessor) =>
        accessor.get(IDelayedOwnerService)
      );

      vi.runAllTimers();

      expect(DelayedOwnerService.created).toBe(1);
      expect(DelayedTransientService.created).toBe(1);
    });
  });

  describe('scoped service', () => {
    test
      .override('rootInstantiationKey', TransientScopeRootRegistry.key)
      .override('childInstantiationKey', TransientScopeChildRegistry.key);

    test('should resolve parent-owned singleton with transient dependency from parent scope', () => {
      const owner = child.invokeFunction((accessor) =>
        accessor.get(IScopeOwnerService)
      );

      expect(owner.scopedService).toBeInstanceOf(RootScopedService);
      expect(owner.instantiationService).toBe(instantiationService);
    });

    test('should create paren-owned with transient dependency using child overrides', () => {
      const owner = child.createInstance(ScopeOwnerService);

      expect(owner.scopedService).toBeInstanceOf(ChildScopedService);
      expect(owner.instantiationService).toBe(child);
    });

    describe('diamond services graph registry', () => {
      test
        .override('rootInstantiationRegistry', () => new DiamondRegistry())
        .override(
          'childInstantiationRegistry',
          () => new DeepScopedChildRegistry()
        );

      test(
        'should create diamond graph with transient dependency shared by two services as a cycle',
        { meta: { childInstantiationKey: null } },
        () => {
          const top = instantiationService.invokeFunction((accessor) =>
            accessor.get(IDiamondTopService)
          );

          expect(top.leftService.sharedService).toBeInstanceOf(
            DiamondSharedService
          );
          expect(top.rightService.sharedService).toBeInstanceOf(
            DiamondSharedService
          );
          expect(top.leftService.sharedService).not.toBe(
            top.rightService.sharedService
          );
        }
      );

      test('should create parent class with deeply nested child override', () => {
        const top = child.createInstance(DiamondTopService);

        expect(top.leftService.sharedService).toBeInstanceOf(
          ScopedDiamondSharedService
        );

        expect(top.leftService.sharedService.ping()).toBe('scoped ping');
        expect(top.rightService.sharedService.ping()).toBe('scoped ping');
        expect(top.leftService.sharedService).not.toBe(
          top.rightService.sharedService
        );

        const leftService = child.invokeFunction((accessor) =>
          accessor.get(IDiamondLeftService)
        );
        const rightService = child.invokeFunction((accessor) =>
          accessor.get(IDiamondRightService)
        );

        const errorMessage =
          'this singleton instance belongs to parent registry, top was created by child, that singleton instance only is avaible for child registry';

        expect(leftService, errorMessage).not.toBe(top.leftService);
        expect(rightService, errorMessage).not.toBe(top.rightService);
      });

      test('should parent create instance without know child registry', () => {
        const rootSharedService = instantiationService.invokeFunction(
          (accessor) => accessor.get(IDiamondSharedService)
        );

        expect(rootSharedService).toBeInstanceOf(DiamondSharedService);
        expect(rootSharedService.ping()).toBe('pong');
      });

      test('should ignore cached instance in the parent when creating a new instance whose reference is overwritten on child', () => {
        const topRootService =
          instantiationService.createInstance(DiamondTopService);

        expect(
          topRootService.leftService.sharedService,
          'parent create instance should be root service'
        ).toBeInstanceOf(DiamondSharedService);

        const topChildService = child.createInstance(DiamondTopService);

        expect(
          topChildService.leftService,
          'left service with a dependency overwritten by child should create a new instance'
        ).not.toBe(topRootService.leftService);
        expect(topChildService.leftService.sharedService).toBeInstanceOf(
          ScopedDiamondSharedService
        );
      });
    });
  });

  describe('circular dependencies', () => {
    test(
      'should throw error on circular dependencies',
      {
        meta: {
          rootInstantiationKey: BasicCircularConfigurationTestRegistry.key
        }
      },
      () => {
        expect(() =>
          instantiationService.createInstance(CircularTest)
        ).toThrowErrorMatchingSnapshot();
      }
    );

    test(
      'should detect service depending on itself',
      { meta: { rootInstantiationKey: SelfCircularRegistry.key } },
      () => {
        expect(() =>
          instantiationService.invokeFunction((accessor) =>
            accessor.get(ISelfCircularService)
          )
        ).toThrowErrorMatchingSnapshot();
      }
    );

    test(
      'should list every service of a long cycle in dependency order',
      { meta: { rootInstantiationKey: LongCircularRegistry.key } },
      () => {
        expect(() =>
          instantiationService.invokeFunction((accessor) =>
            accessor.get(ILongCircularA)
          )
        ).toThrowErrorMatchingSnapshot();
      }
    );

    test(
      'should leave services that only lead to the cycle out of the error',
      { meta: { rootInstantiationKey: PrefixedCircularRegistry.key } },
      () => {
        expect(() =>
          instantiationService.invokeFunction((accessor) =>
            accessor.get(ICircularPrefixService)
          )
        ).toThrowErrorMatchingSnapshot();
      }
    );

    test(
      'should detect cycle between transient services',
      { meta: { rootInstantiationKey: TransientCircularRegistry.key } },
      () => {
        expect(() =>
          instantiationService.invokeFunction((accessor) =>
            accessor.get(ICircularDependencyA)
          )
        ).toThrowErrorMatchingSnapshot();
      }
    );

    test(
      'should detect cycle between singleton and transient services',
      { meta: { rootInstantiationKey: MixedLifecycleCircularRegistry.key } },
      () => {
        expect(() =>
          instantiationService.invokeFunction((accessor) =>
            accessor.get(ICircularDependencyA)
          )
        ).toThrowErrorMatchingSnapshot();
      }
    );

    test(
      'should throw on resolution when cyclic service supports delayed instantiation',
      { meta: { rootInstantiationKey: DelayedCircularRegistry.key } },
      () => {
        expect(() =>
          instantiationService.invokeFunction((accessor) =>
            accessor.get(ICircularDependencyA)
          )
        ).toThrowErrorMatchingSnapshot();
      }
    );

    test(
      'should resolve parent-owned singleton when child override depends back on it',
      {
        meta: {
          rootInstantiationKey: ScopedCircularRootRegistry.key,
          childInstantiationKey: ScopedCircularChildRegistry.key
        }
      },
      () => {
        const owner = child.invokeFunction((accessor) =>
          accessor.get(IScopedCircularOwner)
        );

        expect(owner.dependency).toBeInstanceOf(RootScopedCircularDependency);
      }
    );

    describe('resolved inside constructor', () => {
      beforeEach(() => {
        vi.useFakeTimers();

        DynamicCircularA.created = 0;
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      test(
        'should throw when constructor resolves a service that depends back on it',
        { meta: { rootInstantiationKey: DynamicCircularRegistry.key } },
        () => {
          expect(() =>
            instantiationService.invokeFunction((accessor) =>
              accessor.get(IDynamicCircularA)
            )
          ).toThrow('recursively instantiating service'); // TODO: improve this

          expect(
            DynamicCircularA.created,
            'After create instance 2 times it will detect the cycle'
          ).toBe(2);
        }
      );

      test(
        'should allow cycle when delayed service resolves its dependent inside constructor',
        { meta: { rootInstantiationKey: LazyCircularRegistry.key } },
        () => {
          const circularA = instantiationService.invokeFunction((accessor) =>
            accessor.get(IDynamicCircularA)
          );

          expect(DynamicCircularA.created).toBe(0);
          expect(circularA.circularB).toBeInstanceOf(DynamicCircularB);
          expect(circularA.circularB.circularA).toBe(circularA);
          expect(DynamicCircularA.created).toBe(1);
        }
      );

      test(
        'should throw on every access when dependent uses delayed service inside constructor',
        { meta: { rootInstantiationKey: ReentrantLazyCircularRegistry.key } },
        () => {
          const circularA = instantiationService.invokeFunction((accessor) =>
            accessor.get(IDynamicCircularA)
          );

          expect(DynamicCircularA.created).toBe(0);
          expect(() => circularA.circularB).toThrow(
            'recursively instantiating service'
          );
        }
      );

      test(
        'should hold error of idle construction until first access',
        { meta: { rootInstantiationKey: ReentrantLazyCircularRegistry.key } },
        () => {
          const circularA = instantiationService.invokeFunction((accessor) =>
            accessor.get(IDynamicCircularA)
          );

          expect(DynamicCircularA.created).toBe(0);
          expect(() => vi.runAllTimers()).not.toThrow();
          expect(() => circularA.circularB).toThrow(
            'recursively instantiating service'
          );
        }
      );
    });
  });
});
