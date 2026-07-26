import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type { DoctorHandler, DoctorReport } from "#gitwe/application/handlers/DoctorHandler";

export class DoctorModule implements KernelModule<void, DoctorReport> {
  readonly name = "doctor";
  readonly description = "Run sanity checks against the repo and the active workflow.";

  constructor(private readonly handler: DoctorHandler) {}

  execute(): Promise<DoctorReport> {
    return this.handler.handle();
  }
}
