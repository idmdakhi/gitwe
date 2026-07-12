import type { Plugin, PluginContext } from "@gwe/runtime";

import { CheckoutExecutor } from "./executors/checkout-executor";

import { CommitExecutor } from "./executors/commit-executor";

import { PushExecutor } from "./executors/push-executor";

export class GitPlugin implements Plugin {
  public readonly id = "git";

  public readonly name = "Git";

  public readonly version = "1.0.0";

  public readonly description = "Git Plugin";

  public async install(context: PluginContext): Promise<void> {
    context.registerExecutor(
      "git.checkout",

      new CheckoutExecutor(),
    );

    context.registerExecutor(
      "git.commit",

      new CommitExecutor(),
    );

    context.registerExecutor(
      "git.push",

      new PushExecutor(),
    );
  }
}
