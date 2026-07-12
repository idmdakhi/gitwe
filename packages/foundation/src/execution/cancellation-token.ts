export class CancellationToken {
  private cancelled = false;

  public cancel(): void {
    this.cancelled = true;
  }

  public get isCancelled(): boolean {
    return this.cancelled;
  }
}
