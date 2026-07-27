import type { Capability, WorkflowContext } from "../Capability";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";

export interface TagInput {
  tag: string;
  message?: string;
  annotated?: boolean;
  push?: boolean;
  remote?: string;
}

export interface TagOutput {
  tag: string;
  created: boolean;
  pushed?: boolean;
}

export class TagCapability implements Capability<TagInput, TagOutput> {
  readonly name = "tag";
  readonly description = "Create and push git tags";

  constructor(private readonly git: GitRepository) {}

  async execute(input: TagInput, ctx: WorkflowContext): Promise<TagOutput> {
    const { tag, message, annotated = true, push = false, remote = "origin" } = input;

    ctx.logger.info(`Creating tag: ${tag}`);

    // Check if tag already exists
    try {
      const result = await this.git.runRaw(["rev-parse", tag]);
      if (result.stdout.trim()) {
        ctx.logger.warn(`Tag "${tag}" already exists, skipping creation`);
        return { tag, created: false };
      }
    } catch {
      // Tag doesn't exist, proceed
    }

    // Create annotated or lightweight tag
    const args = ["tag"];
    if (annotated) {
      args.push("-a", tag, "-m", message ?? `Release ${tag}`);
    } else {
      args.push(tag);
    }
    await this.git.runRaw(args);

    // Push tag if requested
    let pushed = false;
    if (push) {
      await this.git.runRaw(["push", remote, tag]);
      pushed = true;
    }

    return { tag, created: true, pushed };
  }
}
