import { describe, expect, it } from "vitest";
import {
  normaliseRemote,
  resolvePushRemotes,
  resolveFetchRemotes,
} from "../../src/domain/remote.js";
import { parseRemoteField } from "../../src/domain/config/parse-remote.js";
import { ConfigError } from "../../src/domain/errors.js";

describe("normaliseRemote", () => {
  it("name when input is null/undefined", () => {
    expect(normaliseRemote(undefined)).toEqual({
      name: "origin",
      fetch: ["origin"],
      push: ["origin"],
    });
  });

  it("accepts legacy string form", () => {
    expect(normaliseRemote("upstream")).toEqual({
      name: "upstream",
      fetch: ["upstream"],
      push: ["upstream"],
    });
  });

  it("accepts object with default only", () => {
    expect(normaliseRemote({ name: "origin" })).toEqual({
      name: "origin",
      fetch: ["origin"],
      push: ["origin"],
    });
  });

  it("accepts name as alias for default", () => {
    expect(normaliseRemote({ name: "origin" })).toEqual({
      name: "origin",
      fetch: ["origin"],
      push: ["origin"],
    });
  });

  it("accepts explicit fetch and push lists", () => {
    expect(
      normaliseRemote({
        name: "origin",
        fetch: ["origin"],
        push: ["origin", "mirror"],
      }),
    ).toEqual({
      name: "origin",
      fetch: ["origin"],
      push: ["origin", "mirror"],
    });
  });

  it("accepts fetch/push as single string", () => {
    expect(
      normaliseRemote({
        name: "origin",
        fetch: "origin",
        push: "mirror",
      }),
    ).toEqual({
      name: "origin",
      fetch: ["origin"],
      push: ["mirror"],
    });
  });
});

describe("resolvePushRemotes", () => {
  const workflowRemote = normaliseRemote({
    name: "origin",
    push: ["origin", "mirror"],
  });

  it("uses topic pushRemote when provided", () => {
    expect(
      resolvePushRemotes({
        workflowRemote,
        topicPushRemote: "upstream",
      }),
    ).toEqual(["upstream"]);
  });

  it("uses parent remote when no topic override", () => {
    expect(
      resolvePushRemotes({
        workflowRemote,
        parentRemote: "release-remote",
      }),
    ).toEqual(["release-remote"]);
  });

  it("falls back to workflow push list", () => {
    expect(resolvePushRemotes({ workflowRemote })).toEqual(["origin", "mirror"]);
  });
});

describe("resolveFetchRemotes", () => {
  it("returns the workflow fetch list", () => {
    const remote = normaliseRemote({
      name: "origin",
      fetch: ["origin", "upstream"],
    });
    expect(resolveFetchRemotes(remote)).toEqual(["origin", "upstream"]);
  });
});

describe("parseRemoteField", () => {
  it("parses string", () => {
    expect(parseRemoteField("origin").name).toBe("origin");
  });

  it("parses object", () => {
    const result = parseRemoteField({
      name: "origin",
      push: ["origin", "backup"],
    });
    expect(result.push).toEqual(["origin", "backup"]);
  });

  it("throws on empty string", () => {
    expect(() => parseRemoteField("  ")).toThrow(ConfigError);
  });

  it("throws on invalid type", () => {
    expect(() => parseRemoteField(42)).toThrow(ConfigError);
  });

  it("throws on empty object", () => {
    expect(() => parseRemoteField({})).toThrow(ConfigError);
  });
});
