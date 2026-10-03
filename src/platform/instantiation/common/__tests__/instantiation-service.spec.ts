import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IInstantiationService } from '../instantiation.api';
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
  TransientScopeRootRegistry
} from './configuration-test-registry';

describe('instantiation service', () => {
  let instantiationService: IInstantiationService;

  beforeEach(() => {
    instantiationService = new InstantiationService(
      new BasicTestConfigurationTestRegistry()
    );
  });

  describe('createInstance', () => {
    test('should create instance with injected services', () => {
      const result = instantiationService.createInstance(BasicTest);

      expect(result).not.toBeNull();
      expect(result.testService).toBeInstanceOf(TestService);
    });
  });

  describe('invoke function', () => {
    test('should create instance registered', () => {
      const result = instantiationService.invokeFunction((accessor) =>
        accessor.get(ITestService)
      );

      expect(result).toBeInstanceOf(TestService);
    });

    test('should create diamond graph with transient dependency shared by two services as a cycle', () => {
      instantiationService = new InstantiationService(new DiamondRegistry());

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
    });

    describe('supportsDelayedInstantiation', () => {
      beforeEach(() => {
        vi.useFakeTimers();

        EagerTransientService.created = 0;
        DelayedTransientService.created = 0;
        DelayedOwnerService.created = 0;

        instantiationService = new InstantiationService(
          new DelayedTransientRegistry()
        );
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

        expect(owner.eagerTransientService).toBeInstanceOf(
          EagerTransientService
        );
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
  });

  describe('scoped service', () => {
    let child: IInstantiationService;

    beforeEach(() => {
      instantiationService = new InstantiationService(
        new TransientScopeRootRegistry()
      );
      child = instantiationService.createChild(
        new TransientScopeChildRegistry()
      );
    });

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
  });

  describe('circular dependencies', () => {
    test('should throw error on circular dependencies', () => {
      instantiationService = new InstantiationService(
        new BasicCircularConfigurationTestRegistry()
      );

      expect(() =>
        instantiationService.createInstance(CircularTest)
      ).toThrowErrorMatchingSnapshot();
    });

    test('should detect service depending on itself', () => {
      instantiationService = new InstantiationService(
        new SelfCircularRegistry()
      );

      expect(() =>
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ISelfCircularService)
        )
      ).toThrowErrorMatchingSnapshot();
    });

    test('should list every service of a long cycle in dependency order', () => {
      instantiationService = new InstantiationService(
        new LongCircularRegistry()
      );

      expect(() =>
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ILongCircularA)
        )
      ).toThrowErrorMatchingSnapshot();
    });

    test('should leave services that only lead to the cycle out of the error', () => {
      instantiationService = new InstantiationService(
        new PrefixedCircularRegistry()
      );

      expect(() =>
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ICircularPrefixService)
        )
      ).toThrowErrorMatchingSnapshot();
    });

    test('should detect cycle between transient services', () => {
      instantiationService = new InstantiationService(
        new TransientCircularRegistry()
      );

      expect(() =>
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ICircularDependencyA)
        )
      ).toThrowErrorMatchingSnapshot();
    });

    test('should detect cycle between singleton and transient services', () => {
      instantiationService = new InstantiationService(
        new MixedLifecycleCircularRegistry()
      );

      expect(() =>
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ICircularDependencyA)
        )
      ).toThrowErrorMatchingSnapshot();
    });

    test('should throw on resolution when cyclic service supports delayed instantiation', () => {
      instantiationService = new InstantiationService(
        new DelayedCircularRegistry()
      );

      expect(() =>
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ICircularDependencyA)
        )
      ).toThrowErrorMatchingSnapshot();
    });

    test('should resolve parent-owned singleton when child override depends back on it', () => {
      instantiationService = new InstantiationService(
        new ScopedCircularRootRegistry()
      );

      const child = instantiationService.createChild(
        new ScopedCircularChildRegistry()
      );

      const owner = child.invokeFunction((accessor) =>
        accessor.get(IScopedCircularOwner)
      );

      expect(owner.dependency).toBeInstanceOf(RootScopedCircularDependency);
    });

    describe('resolved inside constructor', () => {
      beforeEach(() => {
        vi.useFakeTimers();

        DynamicCircularA.created = 0;
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      test('should throw when constructor resolves a service that depends back on it', () => {
        instantiationService = new InstantiationService(
          new DynamicCircularRegistry()
        );

        expect(() =>
          instantiationService.invokeFunction((accessor) =>
            accessor.get(IDynamicCircularA)
          )
        ).toThrow('recursively instantiating service'); // TODO: improve this

        expect(DynamicCircularA.created).toBe(1);
      });

      test('should allow cycle when delayed service resolves its dependent inside constructor', () => {
        instantiationService = new InstantiationService(
          new LazyCircularRegistry()
        );

        const circularA = instantiationService.invokeFunction((accessor) =>
          accessor.get(IDynamicCircularA)
        );

        expect(DynamicCircularA.created).toBe(0);
        expect(circularA.circularB).toBeInstanceOf(DynamicCircularB);
        expect(circularA.circularB.circularA).toBe(circularA);
        expect(DynamicCircularA.created).toBe(1);
      });

      test('should throw on every access when dependent uses delayed service inside constructor', () => {
        instantiationService = new InstantiationService(
          new ReentrantLazyCircularRegistry()
        );

        const circularA = instantiationService.invokeFunction((accessor) =>
          accessor.get(IDynamicCircularA)
        );

        expect(DynamicCircularA.created).toBe(0);
        expect(() => circularA.circularB).toThrow(
          'recursively instantiating service'
        );
      });

      test('should hold error of idle construction until first access', () => {
        instantiationService = new InstantiationService(
          new ReentrantLazyCircularRegistry()
        );

        const circularA = instantiationService.invokeFunction((accessor) =>
          accessor.get(IDynamicCircularA)
        );

        expect(DynamicCircularA.created).toBe(0);
        expect(() => vi.runAllTimers()).not.toThrow();
        expect(() => circularA.circularB).toThrow(
          'recursively instantiating service'
        );
      });
    });
  });
});
