export interface MergeOptions {
  message?: string;
  noFf?: boolean;
  squash?: boolean;
  noVerify?: boolean;
}

export interface TagOptions {
  message?: string;
  sign?: boolean;
  signingKey?: string;
  ref?: string;
}

export interface PushOptions {
  setUpstream?: boolean;
  force?: boolean;
  pushOptions?: string[];
  delete?: boolean;
  followTags?: boolean;
}

export interface AheadBehind {
  ahead: number;
  behind: number;
}

/** Everything the engine needs from git; implemented by {@link ShellGitRepository}. */
export interface GitRepository {
  readonly cwd: string;

  root(): Promise<string>;
  gitDir(): Promise<string>;

  currentBranch(): Promise<string | undefined>;
  listBranches(): Promise<string[]>;
  listRemoteBranches(remote: string): Promise<string[]>;
  branchExists(branch: string): Promise<boolean>;
  remoteBranchExists(remote: string, branch: string): Promise<boolean>;
  revParse(ref: string): Promise<string>;
  refExists(ref: string): Promise<boolean>;
  upstreamOf(branch: string): Promise<string | undefined>;
  aheadBehind(ref: string, base: string): Promise<AheadBehind>;
  isAncestor(ancestor: string, descendant: string): Promise<boolean>;

  isClean(): Promise<boolean>;
  conflictedFiles(): Promise<string[]>;
  mergeInProgress(): Promise<boolean>;
  rebaseInProgress(): Promise<boolean>;
  hasCommits(): Promise<boolean>;

  createBranch(branch: string, startPoint: string): Promise<void>;
  checkout(branch: string): Promise<void>;
  deleteBranch(branch: string, force: boolean): Promise<void>;
  renameBranch(from: string, to: string): Promise<void>;
  createTrackingBranch(branch: string, remote: string): Promise<void>;
  setUpstream(branch: string, remote: string): Promise<void>;
  resetHard(ref: string): Promise<void>;

  merge(branch: string, options?: MergeOptions): Promise<void>;
  abortMerge(): Promise<void>;
  rebase(onto: string): Promise<void>;
  abortRebase(): Promise<void>;
  continueRebase(): Promise<void>;
  commit(message: string, options?: { noVerify?: boolean }): Promise<void>;
  hasStagedChanges(): Promise<boolean>;

  tags(): Promise<string[]>;
  createTag(name: string, options?: TagOptions): Promise<void>;
  deleteTag(name: string): Promise<void>;

  fetch(remote: string, refspec?: string): Promise<void>;
  push(remote: string, branch: string, options?: PushOptions): Promise<void>;
  remoteExists(remote: string): Promise<boolean>;

  raw(args: string[]): Promise<string>;

  renderTagName(
    format: string,
    versionObj: {
      tagPrefix: string;
      major: number;
      minor: number;
      patch: number;
      prerelease?: string;
    },
  ): string;
  parseVersion(
    newVersion: string,
  ): { major: number; minor: number; patch: number; prerelease?: string } | null;
  bumpVersion(currentVersion: string, bumpType: "major" | "minor" | "patch" | "prerelease"): string;
  getVersionFromYaml(versionPath: string): Promise<string>;
  getPackageVersion(): Promise<string>;
  setVersionInYaml(versionPath: string, newVersion: string): Promise<void>;
  setPackageVersion(version: string): Promise<void>;
  tagExists(tagName: string): Promise<boolean>;

  cherryPickRange(base: string, topic: string): Promise<void>;
  cherryPickAbort(): Promise<void>;
}
