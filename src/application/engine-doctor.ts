/**
 * Extension of the Engine with the doctor capability (RFC-0003).
 * Keep this separate so the core Engine file stays focused.
 */

import type { DoctorOptions, DoctorReport } from "./use-case/doctor.js";
import { DoctorUseCase } from "./use-case/doctor.js";
import type { GitRepository } from "./interfaces/git-repository.js";
import type { OperationStateStore } from "./interfaces/operation-state.js";
import type { Logger } from "./interfaces/logger.js";
import type { Workflow } from "../domain/workflow.js";

/**
 * Minimal surface required to run doctor.
 * The real Engine already exposes these members.
 */
export interface DoctorCapable {
  readonly git: GitRepository;
  readonly workflow: Workflow;
  readonly context: {
    state: OperationStateStore;
    logger: Logger;
  };
}

/**
 * Run the doctor use-case against an Engine-like object.
 */
export async function runDoctor(
  engine: DoctorCapable,
  options: DoctorOptions = {},
): Promise<DoctorReport> {
  const useCase = new DoctorUseCase(
    engine.git,
    engine.workflow,
    engine.context.state,
    engine.context.logger,
  );
  return useCase.run(options);
}
