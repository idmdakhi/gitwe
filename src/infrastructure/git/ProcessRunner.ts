import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Thin wrapper around `child_process.execFile`. Infrastructure-only; nothing above this layer touches `node:child_process` directly. */
export class ProcessRunner {
  async run(command: string, args: string[], cwd?: string): Promise<ProcessResult> {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { cwd });
      return { exitCode: 0, stdout, stderr };
    } catch (error: unknown) {
      const err = error as { code?: number; stdout?: string; stderr?: string; message: string };
      return {
        exitCode: err.code ?? 1,
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? err.message,
      };
    }
  }
}
