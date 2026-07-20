import { Workflow } from "../../domain/aggregates/Workflow";
import { StatusService } from "../services/StatusService";
import { GetStatusQuery } from "../queries/GetStatusQuery";
import { StatusReport } from "../dto/StatusReport";

export class GetStatusHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly statusService: StatusService,
  ) {}

  async handle(query: GetStatusQuery): Promise<StatusReport> {
    return this.statusService.buildReport(this.workflow, query.rootBranch ?? "main");
  }
}
