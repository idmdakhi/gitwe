export class Branch {
  constructor(
    readonly type: string,

    readonly name: string,

    readonly fullName: string,

    readonly base: string,

    readonly target: string[],
  ) {}
}
