import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IInstantiationService } from '../instantiation.api';
import { InstantiationService } from '../instantiation-service';
import {
  BasicCircularConfigurationTestRegistry,
  BasicTest,
  BasicTestConfigurationTestRegistry,
  ChildScopedService,
  CircularTest,
  DelayedOwnerService,
  DelayedTransientRegistry,
  DelayedTransientService,
  EagerTransientService,
  IDelayedOwnerService,
  IScopeOwnerService,
  ITestService,
  RootScopedService,
  ScopeOwnerService,
  TestService,
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

    describe('circular dependencies', () => {
      beforeEach(() => {
        instantiationService = new InstantiationService(
          new BasicCircularConfigurationTestRegistry()
        );
      });

      test('should throw error on circular dependencies', () => {
        expect(() =>
          instantiationService.createInstance(CircularTest)
        ).toThrowErrorMatchingSnapshot();
      });
    });
  });

  describe('invoke function', () => {
    test('should create instance registered', () => {
      const result = instantiationService.invokeFunction((accessor) =>
        accessor.get(ITestService)
      );

      expect(result).toBeInstanceOf(TestService);
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
});
