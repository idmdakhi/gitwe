import { describe, expect, it } from "vitest";

import {
  ValidationError,
  ConflictError,
  isDomainError,
} from "../src/errors/index.js";

describe("Errors", () => {
  it("creates validation error", () => {
    const error = new ValidationError("invalid input");

    expect(error.code).toBe("VALIDATION.INVALID");
  });

  it("creates conflict error", () => {
    const error = new ConflictError("already exists");

    expect(error.code).toBe("CONFLICT.STATE");
  });

  it("is domain error", () => {
    expect(isDomainError(new ValidationError("x"))).toBe(true);
  });
});
