import { Workflow } from "#gitwe/domain/aggregates/workflow";
import { BaseBranchRule } from "#gitwe/domain/valueObjects/base-branch-rule";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/branch-type-rule";
import { RemoteConfig } from "#gitwe/domain/valueObjects/remote-config";
import { BranchNamingPolicy, type BranchNameCase } from "#gitwe/domain/valueObjects/branch-naming-policy";
import type { UpdateStrategy, MergeStrategy } from "#gitwe/domain/valueObjects/merge-strategy";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors/index";

/** Plain-JSON shape of a persisted workflow configuration (`gitwe.json`/`gitwe.yaml`). @public */
export interface WorkflowConfigFile {
  name: string;
  remote?: string;
  protectedBranches?: string[];
  branchNaming?: { case?: BranchNameCase; maxLength?: number; pattern?: string };
  baseBranches: Array<{
    name: string;
    parent?: string;
    downstreamStrategy?: UpdateStrategy;
    autoUpdate?: boolean;
  }>;
  branchTypes: Array<{
    name: string;
    prefix: string;
    parent: string;
    startingPoint?: string;
    upstreamStrategy?: MergeStrategy;
    deleteOnFinish?: boolean;
    keepRemote?: boolean;
    autoTag?: { enabled: boolean; prefix?: string };
  }>;
}

/**
 * Converts between the {@link Workflow} aggregate and the plain,
 * JSON/YAML-serializable {@link WorkflowConfigFile} shape persisted to
 * disk. Kept separate from `Workflow` itself so the domain layer has no
 * knowledge of file formats.
 *
 * @public
 */
export const WorkflowSerializer = {
  toPlain(workflow: Workflow): WorkflowConfigFile {
    return {
      name: workflow.name,
      remote: workflow.remote.remote,
      protectedBranches: [...workflow.protectedBranches].filter(
        (name) => !workflow.baseBranches.some((b) => b.name === name),
      ),
      baseBranches: workflow.baseBranches.map((b) => ({
        name: b.name,
        ...(b.parent !== undefined ? { parent: b.parent } : {}),
        downstreamStrategy: b.downstreamStrategy,
        autoUpdate: b.autoUpdate,
      })),
      branchTypes: workflow.branchTypes.map((t) => ({
        name: t.name,
        prefix: t.prefix,
        parent: t.parent,
        startingPoint: t.startingPoint,
        upstreamStrategy: t.upstreamStrategy,
        deleteOnFinish: t.deleteOnFinish,
        keepRemote: t.keepRemote,
        autoTag: t.autoTag,
      })),
    };
  },

  fromPlain(config: WorkflowConfigFile): Workflow {
    if (!config || typeof config !== "object") {
      throw new InvalidWorkflowDefinitionError("configuration must be an object");
    }

    return Workflow.create({
      name: config.name,
      remote: RemoteConfig.create(config.remote !== undefined ? { remote: config.remote } : {}),
      ...(config.protectedBranches !== undefined
        ? { protectedBranches: config.protectedBranches }
        : {}),
      ...(config.branchNaming !== undefined
        ? { branchNaming: BranchNamingPolicy.create(config.branchNaming) }
        : {}),
      baseBranches: (config.baseBranches ?? []).map((b) => BaseBranchRule.create(b)),
      branchTypes: (config.branchTypes ?? []).map((t) => BranchTypeRule.create(t)),
    });
  },
};
