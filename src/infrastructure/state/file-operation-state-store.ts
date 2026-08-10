import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { OperationStateError } from "../../domain/errors.js";
import type {
  OperationState,
  OperationStateStore,
} from "../../application/interfaces/operation-state.js";

export const STATE_FILE = "gitwe/operation.json";

export class FileOperationStateStore implements OperationStateStore {
  private readonly file: string;

  constructor(gitDir: string) {
    this.file = join(gitDir, STATE_FILE);
  }

  exists(): boolean {
    return existsSync(this.file);
  }

  read(): OperationState | undefined {
    if (!this.exists()) return undefined;
    try {
      const raw = readFileSync(this.file, "utf8");
      const state = JSON.parse(raw) as OperationState;
      // اگر نسخهٔ قدیمی باشد (با فیلدهای stepIndex و ...) آن را به شکل جدید تبدیل می‌کنیم
      return this.migrate(state);
    } catch (error) {
      throw new OperationStateError(
        `cannot read saved operation state: ${(error as Error).message}`,
        `delete ${this.file} to start over`,
      );
    }
  }

  private migrate(state: any): OperationState {
    // اگر state قدیمی باشد (stepIndex دارد) آن را به شکل جدید تبدیل کن
    if (state.stepIndex !== undefined && state.currentStep === undefined) {
      const steps = state.completedSteps || [];
      const currentStep = steps.length > 0 ? steps[steps.length - 1] : "";
      return {
        version: state.version || 1,
        operation: state.operation || "finish",
        currentStep,
        completedSteps: steps,
        data: {
          branch: state.branch,
          branchType: state.branchType || state.topicType,
          options: state.options || {},
          originalBranch: state.originalBranch,
          snapshots: state.snapshots || {},
          createdTags: state.createdTags || [],
          stepIndex: state.stepIndex || 0,
        },
        startedAt: state.startedAt || new Date().toISOString(),
      };
    }
    return state;
  }

  require(): OperationState {
    const state = this.read();
    if (state === undefined) {
      throw new OperationStateError("no gitwe operation to continue or abort");
    }
    return state;
  }

  async write(state: OperationState): Promise<void> {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(state, null, 2), "utf8");
  }

  async clear(): Promise<void> {
    rmSync(this.file, { force: true });
  }
}
