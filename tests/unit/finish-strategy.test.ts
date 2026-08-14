import { describe, expect, it } from "vitest";
import { resolveFinishStrategy } from "../../src/cli/commands/finish-strategy.js";
import { ValidationError } from "../../src/domain/errors.js";

describe("resolveFinishStrategy", () => {
  it("returns empty when no flags", () => {
    expect(resolveFinishStrategy({})).toEqual({});
  });

  it("honours --strategy", () => {
    expect(resolveFinishStrategy({ strategy: "cherry-pick" })).toEqual({
      strategy: "cherry-pick",
    });
    expect(resolveFinishStrategy({ strategy: "rebase-merge" })).toEqual({
      strategy: "rebase-merge",
    });
  });

  it("normalises strategy case", () => {
    expect(resolveFinishStrategy({ strategy: "Cherry-Pick" })).toEqual({
      strategy: "cherry-pick",
    });
  });

  it("throws on unknown strategy", () => {
    expect(() => resolveFinishStrategy({ strategy: "octopus" })).toThrow(ValidationError);
  });

  it("--strategy wins over shortcuts", () => {
    expect(
      resolveFinishStrategy({
        strategy: "merge",
        cherryPick: true,
        squash: true,
      }),
    ).toEqual({ strategy: "merge" });
  });

  it("shortcut --cherry-pick", () => {
    expect(resolveFinishStrategy({ cherryPick: true })).toEqual({
      strategy: "cherry-pick",
    });
  });

  it("shortcut --rebase-merge", () => {
    expect(resolveFinishStrategy({ rebaseMerge: true })).toEqual({
      strategy: "rebase-merge",
    });
  });

  it("shortcut --squash", () => {
    expect(resolveFinishStrategy({ squash: true })).toEqual({
      strategy: "squash",
    });
  });

  it("shortcut --rebase", () => {
    expect(resolveFinishStrategy({ rebase: true })).toEqual({
      strategy: "rebase",
    });
  });

  it("shortcut priority: cherry-pick > rebase-merge > squash > rebase", () => {
    expect(
      resolveFinishStrategy({
        cherryPick: true,
        rebaseMerge: true,
        squash: true,
        rebase: true,
      }),
    ).toEqual({ strategy: "cherry-pick" });

    expect(
      resolveFinishStrategy({
        rebaseMerge: true,
        squash: true,
        rebase: true,
      }),
    ).toEqual({ strategy: "rebase-merge" });
  });
});
