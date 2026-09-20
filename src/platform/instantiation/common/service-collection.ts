import type {
  IServiceCollection,
  IServiceIdentifier,
  ServiceEntry
} from './instantiation.api';

export class ServiceCollection implements IServiceCollection {
  private readonly entries = new Map<IServiceIdentifier<unknown>, unknown>();

  constructor(...entries: [IServiceIdentifier<unknown>, unknown][]) {
    for (const [id, entry] of entries) {
      this.set(id, entry);
    }
  }

  set<T>(id: IServiceIdentifier<T>, entry: ServiceEntry<T>): void {
    this.entries.set(id, entry);
  }

  get<T>(id: IServiceIdentifier<T>): ServiceEntry<T> | undefined {
    return this.entries.get(id) as ServiceEntry<T> | undefined;
  }

  has(id: IServiceIdentifier<unknown>): boolean {
    return this.entries.has(id);
  }
}
