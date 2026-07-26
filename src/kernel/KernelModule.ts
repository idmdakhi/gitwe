/**
 * The contract every capability plugs into the kernel through.
 *
 * Deliberately tiny: a name, a human-readable description (used by
 * `gitwe modules` and by anything that wants to introspect what's
 * loaded), and a single `execute`. The kernel itself never inspects
 * `TInput`/`TOutput` — it just dispatches by name — so a module is free
 * to wrap an existing application handler as-is.
 */
export interface KernelModule<TInput = void, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  execute(input: TInput): Promise<TOutput>;
}
