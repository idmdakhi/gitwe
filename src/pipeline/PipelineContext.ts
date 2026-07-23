import { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { GitweConfig } from "#gitwe/config";
import { Branch } from "#gitwe/branch/Branch";
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
