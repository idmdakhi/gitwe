import type { Capability, ConditionalCapability } from "#gitwe/kernel/capabilities/Capability";
import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Workflow } from "#gitwe/domain/aggregates/Workflow";

export interface Policy {
  /** Capability name this policy applies to */
  capability: string;
  /** Branch type name (e.g. "feature", "release") */
  branchType?: string;
  /** Stage this policy applies to */
  stage?: string;
  /** Whether the capability is enabled */
  enabled: boolean;
  /** Additional configuration for the capability */
  config?: Record<string, unknown>;
}

export interface VersioningPolicyConfig {
  enabled: boolean;
  defaultBump: "major" | "minor" | "patch" | "prerelease" | "none";
  tagPrefix: string;
  changelog: {
    enabled: boolean;
    path: string;
  };
}

export class PolicyEngine {
  private policies: Policy[] = [];
  private versioningConfig: VersioningPolicyConfig = {
    enabled: true,
    defaultBump: "patch",
    tagPrefix: "v",
    changelog: { enabled: true, path: "CHANGELOG.md" },
  };

  constructor(private readonly workflow: Workflow) {}

  /**
   * Load policies from workflow configuration.
   */
  loadFromConfig(): void {
    // Load versioning config
    const versioning = (this.workflow as any).versioning;
    if (versioning) {
      this.versioningConfig = {
        enabled: versioning.enabled ?? true,
        defaultBump: versioning.defaultBump ?? "patch",
        tagPrefix: versioning.tagPrefix ?? "v",
        changelog: {
          enabled: versioning.changelog?.enabled ?? true,
          path: versioning.changelog?.path ?? "CHANGELOG.md",
        },
      };
    }

    // Add capability policies
    this.addPolicy({
      capability: "post.version-bump",
      enabled: this.versioningConfig.enabled,
      config: {
        defaultBump: this.versioningConfig.defaultBump,
      },
    });

    this.addPolicy({
      capability: "post.tag",
      enabled: this.versioningConfig.enabled,
      config: {
        prefix: this.versioningConfig.tagPrefix,
      },
    });

    this.addPolicy({
      capability: "post.changelog",
      enabled: this.versioningConfig.changelog.enabled,
      config: {
        path: this.versioningConfig.changelog.path,
      },
    });

    // Add branch type specific policies
    for (const rule of this.workflow.branchTypes) {
      if (rule.bumpVersion && rule.bumpVersion !== "none") {
        this.addPolicy({
          capability: "post.version-bump",
          branchType: rule.name,
          enabled: true,
          config: { bump: rule.bumpVersion },
        });
      }

      if (rule.autoTag) {
        this.addPolicy({
          capability: "post.tag",
          branchType: rule.name,
          enabled: true,
          config: { prefix: rule.autoTag.prefix ?? "v" },
        });
      }
    }

    // Remote policies
    const remote = this.workflow.remote;
    this.addPolicy({
      capability: "finalize.push",
      enabled: remote.autoPush,
    });
  }

  addPolicy(policy: Policy): void {
    // Remove existing policy if any (replace)
    const existingIndex = this.policies.findIndex(
      (p) =>
        p.capability === policy.capability &&
        p.branchType === policy.branchType &&
        p.stage === policy.stage,
    );
    if (existingIndex !== -1) {
      this.policies[existingIndex] = policy;
    } else {
      this.policies.push(policy);
    }
  }

  /**
   * Check if a capability is enabled for the current context.
   */
  isCapabilityEnabled<TInput, TOutput>(
    capability: Capability<TInput, TOutput>,
    context: PipelineContext<TInput, TOutput>,
  ): boolean {
    // If it's a conditional capability, check its own condition first
    if (this.isConditionalCapability(capability)) {
      if (!capability.isEnabled(context.input, context)) {
        return false;
      }
    }

    // Get branch name from input
    const branchName = (context.input as any).branchName as string | undefined;
    const rule = branchName ? context.workflow.findRuleForBranch(branchName) : undefined;

    // Find matching policies
    const matchingPolicies = this.policies.filter(
      (p) =>
        p.capability === capability.name &&
        (!p.branchType || (rule && p.branchType === rule.name)) &&
        (!p.stage || p.stage === context.currentStage),
    );

    if (matchingPolicies.length === 0) {
      // No specific policy, check default
      const defaultPolicy = this.policies.find(
        (p) => p.capability === capability.name && !p.branchType && !p.stage,
      );
      return defaultPolicy?.enabled ?? true;
    }

    return matchingPolicies.every((p) => p.enabled);
  }

  /**
   * Get configuration for a capability.
   */
  getConfig(capabilityName: string, branchName?: string): Record<string, unknown> {
    const matchingPolicies = this.policies.filter((p) => p.capability === capabilityName);

    if (branchName) {
      const rule = this.workflow.findRuleForBranch(branchName);
      if (rule) {
        const branchPolicies = matchingPolicies.filter((p) => p.branchType === rule.name);
        if (branchPolicies.length > 0) {
          return Object.assign({}, ...branchPolicies.map((p) => p.config ?? {}));
        }
      }
    }

    const defaultPolicy = matchingPolicies.find((p) => !p.branchType && !p.stage);
    return defaultPolicy?.config ?? {};
  }

  /**
   * Get versioning configuration.
   */
  getVersioningConfig(): VersioningPolicyConfig {
    return { ...this.versioningConfig };
  }

  private isConditionalCapability<TInput, TOutput>(
    cap: Capability<TInput, TOutput>,
  ): cap is ConditionalCapability<TInput, TOutput> {
    return typeof (cap as ConditionalCapability<TInput, TOutput>).isEnabled === "function";
  }
}
