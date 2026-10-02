import { beforeEach, describe, expect, test } from 'vitest';
import { IInstantiationService } from '../instantiation.api';
import { InstantiationService } from '../instantiation-service';
import {
  BasicTest,
  BasicTestConfigurationTestRegistry,
  ChildScopedService,
  IScopeOwnerService,
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

    test.todo('should throw error on circular dependencies');
  });

  describe('scoped service', () => {
    let root: IInstantiationService;
    let child: IInstantiationService;

    beforeEach(() => {
      root = new InstantiationService(new TransientScopeRootRegistry());
      child = root.createChild(new TransientScopeChildRegistry());
    });

    test('should resolve parent-owned singleton with transient dependency from parent scope', () => {
      const owner = child.invokeFunction((accessor) =>
        accessor.get(IScopeOwnerService)
      );

      expect(owner.scopedService).toBeInstanceOf(RootScopedService);
      expect(owner.instantiationService).toBe(root);
    });

    test('should create paren-owned with transient dependency using child overrides', () => {
      const owner = child.createInstance(ScopeOwnerService);

      expect(owner.scopedService).toBeInstanceOf(ChildScopedService);
      expect(owner.instantiationService).toBe(child);
    });
  });
});
