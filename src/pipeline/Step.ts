export interface Step {
  execute(context: PipelineContext): Promise<void>;
}
