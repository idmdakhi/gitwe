import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { reportError, exitCodeFor } from "../../src/cli/error-reporter.js";
import { GitweError, ConflictError } from "../../src/domain/errors.js";

describe("error reporter", () => {
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports GitweError with hint", () => {
    const err = new GitweError("TEST", "something went wrong", "try this");
    reportError(err);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("something went wrong"));
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("try this"));
  });

  it("reports GitweError without hint", () => {
    const err = new GitweError("TEST", "something went wrong");
    reportError(err);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("something went wrong"));
    // Should not contain hint line
  });

  it("reports ConflictError with files list", () => {
    const err = new ConflictError("merge conflict", ["file1.ts", "file2.ts"]);
    reportError(err);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("conflict: merge conflict"));
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("file1.ts"));
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("file2.ts"));
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining(err.hint!));
  });

  it("reports unknown error", () => {
    const err = new Error("unexpected");
    reportError(err);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("error: unexpected"));
  });

  it("exitCodeFor returns 2 for ConflictError", () => {
    expect(exitCodeFor(new ConflictError("", []))).toBe(2);
  });

  it("exitCodeFor returns 1 for other errors", () => {
    expect(exitCodeFor(new GitweError("", ""))).toBe(1);
    expect(exitCodeFor(new Error(""))).toBe(1);
  });
});
