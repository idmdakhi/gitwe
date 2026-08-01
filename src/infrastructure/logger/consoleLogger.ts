import type { Logger } from "../../application/interfaces/Logger.js";

export function createConsoleLogger(verbose = false): Logger {
  return {
    debug: (message) => {
      if (verbose) process.stderr.write(`${message}\n`);
    },
    info: (message) => process.stdout.write(`${message}\n`),
    warn: (message) => process.stderr.write(`${message}\n`),
    error: (message) => process.stderr.write(`${message}\n`),
  };
}
