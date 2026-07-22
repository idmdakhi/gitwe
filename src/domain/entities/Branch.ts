/**
 * A branch as it exists in the repository right now. Entities are
 * distinguished from value objects by having an identity (`name`) that
 * persists even as other attributes (like `isCurrent`) change.
 */
export class Branch {
  constructor(
    public readonly name: string,
    public readonly isCurrent: boolean,
    public readonly isRemote: boolean,
  ) {}
}
