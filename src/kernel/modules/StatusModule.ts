import type { KernelModule } from "../KernelModule";
import type { GetStatusHandler } from "#gitwe/application/handlers/GetStatusHandler";
import type { GetStatusQuery } from "#gitwe/application/queries/GetStatusQuery";
import type { StatusReport } from "#gitwe/application/dto/StatusReport";

export class StatusModule implements KernelModule<GetStatusQuery, StatusReport> {
  readonly name = "status";
  readonly description = "Build a branch tree rooted at a given branch (default: main).";

  constructor(private readonly handler: GetStatusHandler) {}

  execute(input: GetStatusQuery): Promise<StatusReport> {
    return this.handler.handle(input);
  }
}
