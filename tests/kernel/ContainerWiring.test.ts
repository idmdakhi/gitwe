import { describe, it, expect } from "vitest";
import os from "node:os";
import { Container } from "#gitwe/cli/container";

describe("Container + Kernel wiring", () => {
  it("registers every application capability into the kernel", () => {
    const container = new Container({ cwd: os.tmpdir(), quiet: true });

    const names = container.kernel.list().map((m) => m.name);
    // لیست ماژول‌های ثبت‌شده در container.ts
    const expectedModules = [
      "start",
      "finish",
      "update",
      "list",
      "status",
      "validate",
      "doctor",
      "cleanup",
      "version:show",
      "version:bump",
    ].sort();
    expect(names).toEqual(expectedModules);
  });

  it("dispatching through the kernel reaches the same handler as calling it directly", async () => {
    const container = new Container({ cwd: os.tmpdir(), quiet: true });

    const viaKernel = await container.kernel.run("validate", "/nonexistent/gitwe.json");
    const viaHandler = container.validateWorkflowHandler.handle("/nonexistent/gitwe.json");

    expect(viaKernel).toEqual(viaHandler);
  });
});
