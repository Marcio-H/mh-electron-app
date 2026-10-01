import { beforeEach, describe, expect, test } from 'vitest';
import { IInstantiationService } from '../instantiation.api';
import { InstantiationService } from '../instantiation-service';
import {
  BasicTest,
  BasicTestConfigurationTestRegistry,
  TestService
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
});
