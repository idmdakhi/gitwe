export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

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
