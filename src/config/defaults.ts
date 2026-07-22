import type { GitweConfig } from "#gitwe/config/types";

export const DEFAULT_CONFIG: GitweConfig = {
  version: 1,

  workflow: "git-flow",

  branches: {
    main: {
      protected: true,
    },

    develop: {
      protected: true,
    },
  },

  types: {
    feature: {
      prefix: "feature/",

      base: "develop",

      target: "develop",

      deleteAfterFinish: true,
    },

    release: {
      prefix: "release/",

      base: "develop",

      target: ["main", "develop"],

      tag: true,
    },

    hotfix: {
      prefix: "hotfix/",

      base: "main",

      target: ["main", "develop"],
    },
  },

  merge: {
    strategy: "merge",

    deleteSource: true,
  },

  tag: {
    enabled: true,

    prefix: "v",
  },

  commit: {
    conventional: {
      enabled: true,
    },
  },

  branchNaming: {
    case: "kebab-case",

    maxLength: 80,
  },
};
