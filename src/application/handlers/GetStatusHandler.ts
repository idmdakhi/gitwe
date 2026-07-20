import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { StatusService } from "#gitwe/application/services/StatusService";
import { GetStatusQuery } from "#gitwe/application/queries/GetStatusQuery";
import { StatusReport } from "#gitwe/application/dto/StatusReport";

export class GetStatusHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly statusService: StatusService,
  ) {}

  async handle(query: GetStatusQuery): Promise<StatusReport> {
    return this.statusService.buildReport(this.workflow, query.rootBranch ?? "main");
  }
}
