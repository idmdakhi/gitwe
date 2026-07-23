import { OperationContext } from "#gitwe/operation/OperationContext";
export interface Operation {
  execute(ctx: OperationContext): Promise<void>;
}
