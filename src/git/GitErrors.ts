export class GitError extends Error {}

export class BranchExistsError extends GitError {}

export class BranchNotFoundError extends GitError {}

export class MergeConflictError extends GitError {}
