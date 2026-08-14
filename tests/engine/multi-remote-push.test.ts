import { describe, expect, it, vi } from "vitest";
import { pushToRemotes, buildPushTargets } from "../../src/application/multi-remote-push.js";
import { publishTopic } from "../../src/application/publish-multi-remote.js";
import { normaliseRemote } from "../../src/domain/remote.js";
import type { GitRepository } from "../../src/application/interfaces/git-repository.js";
import type { Logger } from "../../src/application/interfaces/logger.js";

function mockGit(pushImpl?: (...args: any[]) => Promise<void>): GitRepository {
  return {
    push: pushImpl ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as GitRepository;
}

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("buildPushTargets", () => {
  it("sets upstream only on the first remote", () => {
    const targets = buildPushTargets(["origin", "mirror"], "feature/x", {
      setUpstreamOnFirst: true,
    });
    expect(targets).toEqual([
      {
        remote: "origin",
        ref: "feature/x",
        setUpstream: true,
        tags: undefined,
        pushOptions: undefined,
      },
      {
        remote: "mirror",
        ref: "feature/x",
        setUpstream: false,
        tags: undefined,
        pushOptions: undefined,
      },
    ]);
  });
});

describe("pushToRemotes", () => {
  it("pushes to all remotes in order", async () => {
    const push = vi.fn().mockResolvedValue(undefined);
    const git = mockGit(push);

    const result = await pushToRemotes(git, logger, buildPushTargets(["origin", "mirror"], "main"));

    expect(result.succeeded).toEqual(["origin", "mirror"]);
    expect(result.failed).toBeUndefined();
    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenNthCalledWith(1, "origin", "main", expect.any(Object));
    expect(push).toHaveBeenNthCalledWith(2, "mirror", "main", expect.any(Object));
  });

  it("fails fast on first error", async () => {
    const push = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("permission denied"));
    const git = mockGit(push);

    const result = await pushToRemotes(
      git,
      logger,
      buildPushTargets(["origin", "mirror", "backup"], "main"),
    );

    expect(result.succeeded).toEqual(["origin"]);
    expect(result.failed).toEqual({
      remote: "mirror",
      error: "permission denied",
    });
    expect(push).toHaveBeenCalledTimes(2); // did not try backup
  });

  it("respects explicit remotes override", async () => {
    const push = vi.fn().mockResolvedValue(undefined);
    const git = mockGit(push);

    const result = await pushToRemotes(git, logger, buildPushTargets(["origin"], "feature/x"), {
      remotes: ["mirror"],
    });

    expect(result.succeeded).toEqual(["mirror"]);
    expect(push).toHaveBeenCalledWith("mirror", "feature/x", expect.any(Object));
  });
});

describe("publishTopic", () => {
  const config = {
    remote: normaliseRemote({ name: "origin", push: ["origin", "mirror"] }),
    baseBranches: [{ name: "develop" }],
    branchTypes: [{ name: "feature", base: "develop" }],
  };

  it("publishes to resolved remotes and sets upstream on first", async () => {
    const push = vi.fn().mockResolvedValue(undefined);
    const git = mockGit(push);

    const result = await publishTopic(git, logger, config, config.branchTypes[0], "feature/login");

    expect(result.pushedTo).toEqual(["origin", "mirror"]);
    expect(result.upstream).toBe("origin/feature/login");
    expect(result.failed).toBeUndefined();
  });

  it("honours CLI remote override", async () => {
    const push = vi.fn().mockResolvedValue(undefined);
    const git = mockGit(push);

    const result = await publishTopic(git, logger, config, config.branchTypes[0], "feature/login", {
      remotes: ["upstream"],
    });

    expect(result.pushedTo).toEqual(["upstream"]);
    expect(result.upstream).toBe("upstream/feature/login");
  });
});
