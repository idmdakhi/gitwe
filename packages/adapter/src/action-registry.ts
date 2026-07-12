import type { Action } from "./action";

export class ActionRegistry {
  private readonly actions = new Map<string, Action<any, any>>();

  public register(action: Action<any, any>): void {
    this.actions.set(
      action.type,

      action,
    );
  }

  public resolve(type: string) {
    return this.actions.get(type);
  }
}
