import { IServiceCollection } from '../instantiation.api';

export interface TestRegistry {
  new (): IServiceCollection;
  key: TestRegistryKey;
}

export type TestRegistryKey = number;
