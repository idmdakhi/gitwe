import yaml from "js-yaml";

let colorEnabled = process.env.NO_COLOR === undefined && process.stdout.isTTY === true;

export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled;
}

function paint(code: number, text: string): string {
  return colorEnabled ? `\u001B[${code}m${text}\u001B[0m` : text;
}

export const style = {
  bold: (text: string) => paint(1, text),
  dim: (text: string) => paint(2, text),
  red: (text: string) => paint(31, text),
  green: (text: string) => paint(32, text),
  yellow: (text: string) => paint(33, text),
  blue: (text: string) => paint(34, text),
  cyan: (text: string) => paint(36, text),
  magenta: (text: string) => paint(35, text),
};

export function print(message = ""): void {
  process.stdout.write(`${message}\n`);
}

export function success(message: string): void {
  print(`${style.green("✓")} ${message}`);
}

export function warn(message: string): void {
  process.stderr.write(`${style.yellow("!")} ${message}\n`);
}

/** Render a parent/child branch tree. */
export function renderTree(
  roots: string[],
  childrenOf: (name: string) => string[],
  label: (name: string) => string,
): string[] {
  const lines: string[] = [];
  const walk = (name: string, prefix: string, last: boolean, depth: number): void => {
    const connector = depth === 0 ? "" : `${prefix}${last ? "└─ " : "├─ "}`;
    lines.push(`${connector}${label(name)}`);
    const children = childrenOf(name);
    const nextPrefix = depth === 0 ? "" : `${prefix}${last ? "   " : "│  "}`;
    children.forEach((child, index) => {
      walk(child, nextPrefix, index === children.length - 1, depth + 1);
    });
  };
  roots.forEach((root, index) => walk(root, "", index === roots.length - 1, 0));
  return lines;
}

/** Print structured output in JSON or YAML format. */
export function printStructured(data: unknown, format: "json" | "yaml"): void {
  if (format === "json") {
    print(JSON.stringify(data, null, 2));
  } else if (format === "yaml") {
    print(yaml.dump(data, { lineWidth: 100, noRefs: true }).trimEnd());
  }
}
