import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  renderTree,
  print,
  printStructured,
  style,
  setColorEnabled,
} from "../../src/cli/output.js";

describe("output helpers", () => {
  beforeEach(() => {
    // Disable colors for predictable output
    setColorEnabled(false);
    // Reset stdout spy
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("renderTree", () => {
    it("renders a simple tree", () => {
      const childrenOf = (name: string) => {
        if (name === "main") return ["develop"];
        if (name === "develop") return ["feature"];
        return [];
      };
      const label = (name: string) => name;
      const result = renderTree(["main"], childrenOf, label);
      expect(result).toEqual(["main", "└─ develop", "   └─ feature"]);
    });

    it("renders multiple roots", () => {
      const childrenOf = () => [];
      const label = (n: string) => n;
      const result = renderTree(["a", "b"], childrenOf, label);
      expect(result).toEqual(["a", "b"]);
    });

    it("renders with custom labels", () => {
      const childrenOf = (n: string) => (n === "root" ? ["child1", "child2"] : []);
      const label = (n: string) => `[${n}]`;
      const result = renderTree(["root"], childrenOf, label);
      expect(result).toEqual(["[root]", "├─ [child1]", "└─ [child2]"]);
    });
  });

  describe("print", () => {
    it("writes to stdout with newline", () => {
      const write = vi.spyOn(process.stdout, "write");
      print("hello");
      expect(write).toHaveBeenCalledWith("hello\n");
    });
  });

  describe("printStructured", () => {
    it("prints JSON", () => {
      const write = vi.spyOn(process.stdout, "write");
      const data = { a: 1, b: "test" };
      printStructured(data, "json");
      expect(write).toHaveBeenCalledWith(JSON.stringify(data, null, 2) + "\n");
    });

    it("prints YAML", () => {
      const write = vi.spyOn(process.stdout, "write");
      const data = { a: 1, b: "test" };
      printStructured(data, "yaml");
      // YAML output contains 'a: 1' etc.
      expect(write).toHaveBeenCalledWith(expect.stringContaining("a: 1"));
    });
  });

  describe("style", () => {
    it("returns plain text when colors disabled", () => {
      setColorEnabled(false);
      expect(style.red("text")).toBe("text");
      expect(style.green("text")).toBe("text");
      expect(style.bold("text")).toBe("text");
    });

    it("returns colored text when enabled", () => {
      setColorEnabled(true);
      expect(style.red("text")).toBe("\x1B[31mtext\x1B[0m");
      expect(style.green("text")).toBe("\x1B[32mtext\x1B[0m");
      expect(style.bold("text")).toBe("\x1B[1mtext\x1B[0m");
    });
  });
});
