import { GitRepository } from "#gitwe/domain/ports/GitRepository";
export interface OperationContext {
  git: GitRepository;
  source?: string;
  target?: string;
  // سایر فیلدها...
}
