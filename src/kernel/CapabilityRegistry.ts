import type { Capability, WorkflowContext } from "./Capability";

/**
 * Registry for capabilities. Similar to `Kernel` but for lower-level
 * operations. The kernel registers modules; modules use capabilities.
 * This keeps the kernel clean and capabilities discoverable.
 */
export class CapabilityRegistry {
  private readonly capabilities = new Map<string, Capability<any, any>>();

  register<TInput, TOutput>(capability: Capability<TInput, TOutput>): this {
    if (this.capabilities.has(capability.name)) {
      throw new Error(`Capability "${capability.name}" already registered`);
    }
    this.capabilities.set(capability.name, capability);
    return this;
  }

  get<TInput, TOutput>(name: string): Capability<TInput, TOutput> | undefined {
    return this.capabilities.get(name) as Capability<TInput, TOutput> | undefined;
  }

  list(): Array<{ name: string; description: string }> {
    return [...this.capabilities.values()].map((c) => ({
      name: c.name,
      description: c.description,
    }));
  }

  async run<TInput, TOutput>(
    name: string,
    input: TInput,
    context: WorkflowContext,
  ): Promise<TOutput> {
    const capability = this.get<TInput, TOutput>(name);
    if (!capability) {
      throw new Error(`Capability "${name}" not found`);
    }
    return capability.execute(input, context);
  }
}
