import { describe, expect, it } from "vitest";
import { parseRemoteCliOptions } from "../../src/cli/remote-options.js";
import { publishOptionsFromCli } from "../../src/cli/commands/publish-remote.js";
import { finishRemoteOverride } from "../../src/cli/commands/finish-remote.js";

describe("parseRemoteCliOptions", () => {
  it("returns empty when no flags", () => {
    expect(parseRemoteCliOptions({})).toEqual({});
  });

  it("parses --remote", () => {
    expect(parseRemoteCliOptions({ remote: "upstream" })).toEqual({
      remotes: ["upstream"],
    });
  });

  it("parses --push-to as comma list", () => {
    expect(parseRemoteCliOptions({ pushTo: "origin, mirror, backup" })).toEqual({
      remotes: ["origin", "mirror", "backup"],
    });
  });

  it("--push-to wins over --remote", () => {
    expect(parseRemoteCliOptions({ remote: "origin", pushTo: "mirror,backup" })).toEqual({
      remotes: ["mirror", "backup"],
    });
  });

  it("ignores empty strings", () => {
    expect(parseRemoteCliOptions({ remote: "  " })).toEqual({});
    expect(parseRemoteCliOptions({ pushTo: " , , " })).toEqual({});
  });
});

describe("publishOptionsFromCli", () => {
  it("maps remote flags and push options", () => {
    expect(
      publishOptionsFromCli({
        pushTo: "origin,mirror",
        pushOption: "ci.skip",
      }),
    ).toEqual({
      remotes: ["origin", "mirror"],
      pushOptions: ["ci.skip"],
    });
  });
});

describe("finishRemoteOverride", () => {
  it("returns undefined when --push is not set", () => {
    expect(finishRemoteOverride({ remote: "origin" })).toBeUndefined();
  });

  it("returns remotes when --push and --remote are set", () => {
    expect(finishRemoteOverride({ push: true, remote: "upstream" })).toEqual(["upstream"]);
  });

  it("returns list when --push and --push-to are set", () => {
    expect(finishRemoteOverride({ push: true, pushTo: "origin,mirror" })).toEqual([
      "origin",
      "mirror",
    ]);
  });
});
