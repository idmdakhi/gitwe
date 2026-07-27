import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";

import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";

export class NotificationCapability implements Capability<FinishBranchCommand, FinishBranchResult> {
  readonly name = "finalize.notification";
  readonly description = "Send notifications (e.g., Slack/Teams) about finished branch";

  async execute(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    context.logger.info(`[Notification] Branch ${input.branchName} finished successfully.`);
    // در اینجا می‌توان کد واقعی ارسال اعلان را قرار داد
    return context.output as FinishBranchResult;
  }
}
