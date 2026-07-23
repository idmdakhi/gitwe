import { PipelineContext } from "#gitwe/pipeline/PipelineContext";
export interface Step {
  execute(context: PipelineContext): Promise<void>;
}
