import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { StatusService } from "#gitwe/application/services/status-service";
import type { StatusReport } from "#gitwe/application/dto/results";

/**
 * Use case: build a repository-wide status/overview report. Backs
 * `gitwe status` / `gitwe overview`.
 *
 * @public
 */
export class GetStatusHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly statusService: StatusService,
  ) {}

  async handle(): Promise<StatusReport> {
    return this.statusService.buildReport(this.workflow);
  }
}
