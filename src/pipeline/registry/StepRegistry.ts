export class StepRegistry {
  private readonly map = new Map<string, StepFactory>();

  register(
    name: string,

    factory: StepFactory,
  ) {
    this.map.set(
      name,

      factory,
    );
  }

  resolve(name: string) {
    const factory = this.map.get(name);

    if (!factory) {
      throw new Error(`Unknown step "${name}".`);
    }

    return factory;
  }
}
