import type { KernelModule } from "#gitwe/kernel/KernelModule";
import { ModuleNotFoundError, DuplicateModuleError } from "#gitwe/kernel/errors";

export interface KernelModuleInfo {
  readonly name: string;
  readonly description: string;
}

/**
 * The microkernel: knows how to register and dispatch to modules, and
 * nothing else. It has no idea what "start" or "finish" mean — those are
 * just names some caller registered a module under.
 *
 * Everything that actually does git-workflow work (`StartBranchHandler`,
 * `FinishBranchHandler`, ...) stays exactly where it was, in
 * `application/handlers`. Modules in `kernel/modules/*` are thin adapters
 * that make an existing handler dispatchable by name; the kernel never
 * constructs a handler itself. That's what keeps this a *kernel* — an
 * empty core that capabilities attach to — rather than a rewrite of the
 * application layer.
 */
export class Kernel {
  // A type-erased registry is the standard shape for a name-keyed dispatch
  // table: the kernel can't (and shouldn't) know every module's input/output
  // types up front. Callers recover type safety at the `run<TInput, TOutput>`
  // call site instead, the same way e.g. EventEmitter or a DI container would.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly modules = new Map<string, KernelModule<any, any>>();

  register<TInput, TOutput>(module: KernelModule<TInput, TOutput>): this {
    if (this.modules.has(module.name)) {
      throw new DuplicateModuleError(module.name);
    }
    this.modules.set(module.name, module);
    return this;
  }

  has(name: string): boolean {
    return this.modules.has(name);
  }

  list(): KernelModuleInfo[] {
    return [...this.modules.values()]
      .map((m) => ({ name: m.name, description: m.description }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async run<TInput, TOutput>(name: string, input: TInput): Promise<TOutput> {
    const module = this.modules.get(name);
    if (!module) {
      throw new ModuleNotFoundError(name, [...this.modules.keys()].sort());
    }
    return module.execute(input) as Promise<TOutput>;
  }
}
