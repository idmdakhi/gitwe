import type { GitCommand } from "../domain";

export interface CheckoutCommand extends GitCommand {
  readonly type: "git.checkout";

  readonly branch: string;
}
