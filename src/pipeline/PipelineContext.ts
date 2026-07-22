export class PipelineContext {
  constructor(
    public readonly git: GitRepository,

    public readonly config: GitweConfig,

    public readonly branch: Branch,
  ) {}

  merged = false;

  tagged = false;

  deleted = false;
}

