import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/**
 * Minimal interactive prompts built on Node's readline.
 * No extra dependency — keeps gitwe lean for CI and library use.
 * When stdin is not a TTY, callers should skip the wizard and use --defaults.
 */
export function isInteractive(): boolean {
  return Boolean(input.isTTY && output.isTTY);
}

function createRl(): readline.Interface {
  return readline.createInterface({ input, output, terminal: true });
}

/** Prompt for a line of text. Empty input returns `defaultValue`. */
export async function ask(question: string, defaultValue?: string): Promise<string> {
  const rl = createRl();
  try {
    const suffix = defaultValue !== undefined && defaultValue !== "" ? ` [${defaultValue}]` : "";
    const answer = (await rl.question(`${question}${suffix}: `)).trim();
    return answer === "" && defaultValue !== undefined ? defaultValue : answer;
  } finally {
    rl.close();
  }
}

/** Yes/no prompt. Empty input returns `defaultYes`. */
export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const rl = createRl();
  try {
    const answer = (await rl.question(`${question} (${hint}): `)).trim().toLowerCase();
    if (answer === "") return defaultYes;
    if (["y", "yes"].includes(answer)) return true;
    if (["n", "no"].includes(answer)) return false;
    return defaultYes;
  } finally {
    rl.close();
  }
}

/**
 * Choose one option by number or exact value.
 * Returns the selected value from `choices`.
 */
export async function choose(
  question: string,
  choices: readonly string[],
  defaultValue?: string,
): Promise<string> {
  if (choices.length === 0) {
    throw new Error("choose() requires at least one choice");
  }

  const rl = createRl();
  try {
    output.write(`${question}\n`);
    choices.forEach((c, i) => {
      const mark = c === defaultValue ? " (default)" : "";
      output.write(`  ${i + 1}) ${c}${mark}\n`);
    });

    const defIndex = defaultValue !== undefined ? choices.indexOf(defaultValue) + 1 : 1;
    const defHint = String(defIndex > 0 ? defIndex : 1);

    for (;;) {
      const raw = (await rl.question(`Select [1-${choices.length}] (${defHint}): `)).trim();
      if (raw === "") {
        const idx = defIndex > 0 ? defIndex - 1 : 0;
        return choices[idx]!;
      }

      const asNum = Number(raw);
      if (Number.isInteger(asNum) && asNum >= 1 && asNum <= choices.length) {
        return choices[asNum - 1]!;
      }

      const match = choices.find((c) => c.toLowerCase() === raw.toLowerCase());
      if (match) return match;

      output.write(`  invalid choice — enter a number 1–${choices.length} or a name\n`);
    }
  } finally {
    rl.close();
  }
}

/** Collect key=value pairs from repeated CLI flags (`--branch main=trunk`). */
export function parseKeyValue(pairs: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of pairs) {
    const eq = raw.indexOf("=");
    if (eq <= 0) {
      throw new Error(`expected key=value, got "${raw}"`);
    }
    const key = raw.slice(0, eq).trim();
    const value = raw.slice(eq + 1).trim();
    if (!key || !value) {
      throw new Error(`expected key=value, got "${raw}"`);
    }
    out[key] = value;
  }
  return out;
}
