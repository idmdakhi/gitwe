import type { Logger } from "../../domain/ports/logger.port.js";

const colors = {
  reset: "\x1b[0m", dim: "\x1b[2m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

export class ConsoleLogger implements Logger {
  constructor(private readonly color = true, private readonly verbose = false) {}

  private paint(code: string, text: string): string {
    return this.color ? `${code}${text}${colors.reset}` : text;
  }

  debug(message: string): void {
    if (this.verbose) console.error(this.paint(colors.dim, `[debug] ${message}`));
  }

  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(this.paint(colors.yellow, `warning: ${message}`));
  }

  error(message: string): void {
    console.error(this.paint(colors.red, `error: ${message}`));
  }
}
