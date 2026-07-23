import { MergeStrategy } from "#gitwe/merge/MergeStrategy";
import { SquashMergeStrategy } from "#gitwe/merge/strategies/SquashStrategy";
import { RebaseMergeStrategy } from "#gitwe/merge/strategies/RebaseStrategy";

export class MergeExecutor {
  strategy(name: string) {
    switch (name) {
      case "merge":
        return new MergeStrategy();

      case "squash":
        return new SquashMergeStrategy();

      case "rebase":
        return new RebaseMergeStrategy();

      default:
        throw new Error("Unknown merge strategy.");
    }
  }
}
