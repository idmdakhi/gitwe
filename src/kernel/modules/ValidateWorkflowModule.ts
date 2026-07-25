import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type {
  ValidateWorkflowHandler,
  ValidateWorkflowResult,
} from "#gitwe/application/handlers/ValidateWorkflowHandler";

export class ValidateWorkflowModule implements KernelModule<string, ValidateWorkflowResult> {
  readonly name = "validate";
  readonly description = "Validate a workflow config file without touching a real repo.";

  constructor(private readonly handler: ValidateWorkflowHandler) {}

  async execute(configPath: string): Promise<ValidateWorkflowResult> {
    return this.handler.handle(configPath);
  }
}
