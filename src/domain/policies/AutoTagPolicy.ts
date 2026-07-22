import { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";

/**
 * Encapsulates the rule for turning a finished branch into a tag name,
 * e.g. "release/1.2.0" + autoTag.prefix "v" -> "v1.2.0". Pulled out of
 * the old monolithic `WorkflowEngine.finish()` so the naming rule can be
 * unit-tested and reused independently of git I/O.
 */
export class AutoTagPolicy {
  /** Returns the tag name to create, or `undefined` if this branch type doesn't auto-tag. */
  static tagNameFor(rule: BranchTypeRule, fullBranchName: string): string | undefined {
    if (!rule.autoTag) return undefined;

    const prefix = rule.autoTag.prefix ?? "v";
    let version = fullBranchName.replace(rule.prefix, "");

    if (rule.autoTag.pattern) {
      const match = version.match(new RegExp(rule.autoTag.pattern));
      if (match) version = match[1] ?? version;
    }

    return `${prefix}${version}`;
  }
}
