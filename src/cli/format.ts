/**
 * Minimal ANSI text styling, dependency-free. Disabled automatically when
 * stdout isn't a TTY (e.g. output is piped) or `NO_COLOR` is set,
 * following the https://no-color.org convention.
 *
 * @internal
 */
const colorEnabled = process.stdout.isTTY && !process.env["NO_COLOR"];

function wrap(code: string): (text: string) => string {
  return (text: string) => (colorEnabled ? `\x1b[${code}m${text}\x1b[0m` : text);
}

/** @internal */
export const style = {
  bold: wrap("1"),
  dim: wrap("2"),
  green: wrap("32"),
  yellow: wrap("33"),
  red: wrap("31"),
  cyan: wrap("36"),
};

/** @internal */
export function success(message: string): void {
  console.log(`${style.green("✓")} ${message}`);
}

/** @internal */
export function failure(message: string): void {
  console.error(`${style.red("✖")} ${message}`);
}

/** @internal */
export function info(message: string): void {
  console.log(message);
}
