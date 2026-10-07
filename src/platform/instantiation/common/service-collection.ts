import type {
  IServiceCollection,
  IServiceIdentifier,
  IServiceBinding,
  ServiceEntry
} from './instantiation.api';

export class ServiceCollection implements IServiceCollection {
  //

  private readonly entries = new Map<
    IServiceIdentifier<unknown>,
    IServiceBinding<unknown>
  >();

  constructor(...entries: [IServiceIdentifier<unknown>, unknown][]) {
    for (const [id, entry] of entries) {
      this.set(id, entry);
    }
  }

  save<T>(id: IServiceIdentifier<T>, instance: T): void {
    (this.entries.get(id) as { value: T | undefined }).value = instance;
  }

  get<T>(
    id: IServiceIdentifier<T>,
    includeOverwritten = false
  ): IServiceBinding<T> | undefined {
    if (includeOverwritten) {
      return this.entries.get(id) as IServiceBinding<T> | undefined;
    }

    const binding = this.entries.get(id);

    if (binding?.overridden) {
      return undefined;
    }

    return binding as IServiceBinding<T> | undefined;
  }

  set<T>(
    id: IServiceIdentifier<T>,
    entry: ServiceEntry<T>,
    overridden = false
  ): void {
    this.entries.set(id, { descriptor: entry, value: undefined, overridden });
  }

  has(id: IServiceIdentifier<unknown>): boolean {
    return this.entries.has(id);
  }
}
