import { ValidationError } from "./errors.js";

const INVALID_SEQUENCES = ["..", "@{", "//", "\\"];
// eslint-disable-next-line no-control-regex
const INVALID_CHARS = /[\x00-\x20~^:?*[\]\x7f]/;

/**
 * Reject names git would refuse (see `git check-ref-format`) before any
 * command touches the repository.
 */
export function assertValidBranchName(branch: string): void {
  const fail = (reason: string): never => {
    throw new ValidationError(`invalid branch name "${branch}": ${reason}`);
  };
  if (branch === "") fail("it is empty");
  if (INVALID_CHARS.test(branch)) fail("it contains a character git forbids");
  for (const sequence of INVALID_SEQUENCES) {
    if (branch.includes(sequence)) fail(`it contains "${sequence}"`);
  }
  if (branch.startsWith("/") || branch.endsWith("/")) fail("it starts or ends with /");
  if (branch.startsWith("-")) fail("it starts with -");
  if (branch.endsWith(".") || branch.endsWith(".lock")) fail("it ends with . or .lock");
  if (branch.split("/").some((segment) => segment.startsWith("."))) {
    fail("a path segment starts with .");
  }
}

/** Translate a shell-style glob (`*`, `?`, `[abc]`) into a matcher. */
export function globToRegExp(pattern: string): RegExp {
  let source = "^";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === "*") source += ".*";
    else if (char === "?") source += ".";
    else if (char === "[") {
      const end = pattern.indexOf("]", i + 1);
      if (end === -1) {
        source += "\\[";
      } else {
        source += `[${pattern.slice(i + 1, end)}]`;
        i = end;
      }
    } else source += char.replace(/[.+^${}()|\\]/g, "\\$&");
  }
  return new RegExp(`${source}$`);
}
