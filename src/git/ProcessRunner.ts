import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitResult } from "./GitResult";

const execFileAsync = promisify(execFile);

export class ProcessRunner {
  async run(command: string, args: string[], cwd?: string): Promise<GitResult> {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { cwd });
      return { exitCode: 0, stdout, stderr };
    } catch (error: any) {
      return {
        exitCode: error.code ?? 1,
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? error.message,
      };
    }
  }
}
