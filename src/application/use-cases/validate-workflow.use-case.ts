import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";
import type { ConfigValidationResult } from "../../domain/services/config-validator.service.js";
import { ConfigValidatorService } from "../../domain/services/config-validator.service.js";

export class ValidateWorkflowUseCase {
  constructor(private readonly validator = new ConfigValidatorService()) {}

  execute(config: WorkflowConfig): ConfigValidationResult {
    return this.validator.validate(config);
  }
}
