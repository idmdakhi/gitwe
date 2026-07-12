export interface Adapter {
  readonly id: string;

  readonly name: string;

  readonly version: string;

  install(registry: AdapterRegistry): Promise<void>;
}
