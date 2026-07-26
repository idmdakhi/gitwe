import { describe, it, expect } from "vitest";
import os from "node:os";
import { Container } from "#gitwe/cli/container";

describe("Container + Kernel wiring", () => {
  it("registers every application capability into the kernel", () => {
    // No real git commands run during construction, so a plain tmpdir is fine.
    const container = new Container({ cwd: os.tmpdir(), quiet: true });

    const names = container.kernel.list().map((m) => m.name);
    expect(names).toEqual(
      ["cleanup", "doctor", "finish", "list", "start", "status", "update", "validate"].sort(),
    );
  });

  it("dispatching through the kernel reaches the same handler as calling it directly", async () => {
    const container = new Container({ cwd: os.tmpdir(), quiet: true });

    const viaKernel = await container.kernel.run("validate", "/nonexistent/gitwe.json");
    const viaHandler = container.validateWorkflowHandler.handle("/nonexistent/gitwe.json");

    expect(viaKernel).toEqual(viaHandler);
  });
});
