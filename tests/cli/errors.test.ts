import { describe, it, expect } from "vitest";
import { InvalidCliOptionError } from "#gitwe/cli/errors";
import { DomainError } from "#gitwe/domain/errors";

describe("InvalidCliOptionError", () => {
  it("is a DomainError so the CLI's single error hierarchy still applies", () => {
    const error = new InvalidCliOptionError("--strategy", "bogus", ["merge", "squash", "rebase"]);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe("INVALID_CLI_OPTION");
  });

  it("lists the allowed values in its message", () => {
    const error = new InvalidCliOptionError("--strategy", "bogus", ["merge", "squash", "rebase"]);
    expect(error.message).toContain("bogus");
    expect(error.message).toContain("merge, squash, rebase");
  });
});
