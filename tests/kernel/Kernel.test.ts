import { describe, it, expect } from "vitest";
import { Kernel } from "#gitwe/kernel/Kernel";
import { ModuleNotFoundError, DuplicateModuleError } from "#gitwe/kernel/errors";
import type { KernelModule } from "#gitwe/kernel/KernelModule";

function fakeModule(name: string, description = `does ${name}`): KernelModule<number, number> {
  return {
    name,
    description,
    async execute(input: number) {
      return input * 2;
    },
  };
}

describe("Kernel", () => {
  it("dispatches to a registered module by name", async () => {
    const kernel = new Kernel();
    kernel.register(fakeModule("double"));

    const result = await kernel.run<number, number>("double", 21);
    expect(result).toBe(42);
  });

  it("reports whether a module is registered", () => {
    const kernel = new Kernel();
    expect(kernel.has("double")).toBe(false);
    kernel.register(fakeModule("double"));
    expect(kernel.has("double")).toBe(true);
  });

  it("lists registered modules sorted by name, with their descriptions", () => {
    const kernel = new Kernel();
    kernel.register(fakeModule("zeta", "does zeta things"));
    kernel.register(fakeModule("alpha", "does alpha things"));

    expect(kernel.list()).toEqual([
      { name: "alpha", description: "does alpha things" },
      { name: "zeta", description: "does zeta things" },
    ]);
  });

  it("register() returns the kernel for chaining", () => {
    const kernel = new Kernel();
    const returned = kernel.register(fakeModule("a")).register(fakeModule("b"));
    expect(returned).toBe(kernel);
    expect(kernel.list().map((m) => m.name)).toEqual(["a", "b"]);
  });

  it("throws DuplicateModuleError when two modules share a name", () => {
    const kernel = new Kernel();
    kernel.register(fakeModule("double"));
    expect(() => kernel.register(fakeModule("double"))).toThrow(DuplicateModuleError);
  });

  it("throws ModuleNotFoundError with the list of available modules when dispatching an unknown name", async () => {
    const kernel = new Kernel();
    kernel.register(fakeModule("double"));

    await expect(kernel.run("triple", 1)).rejects.toThrow(ModuleNotFoundError);
    await expect(kernel.run("triple", 1)).rejects.toThrow(/double/);
  });

  it("throws ModuleNotFoundError with a clear message when nothing is registered at all", async () => {
    const kernel = new Kernel();
    await expect(kernel.run("anything", 1)).rejects.toThrow(/no modules are registered at all/);
  });
});
