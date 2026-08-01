/**
 * Input for {@link CheckoutBranchHandler}. `query` may be a full branch
 * name or a partial match; see {@link BranchResolver.resolveForCheckout}.
 * @public
 */
export interface CheckoutBranchCommand {
  readonly query: string;
}
