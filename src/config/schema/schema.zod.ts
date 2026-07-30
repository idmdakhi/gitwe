import { z } from "zod";

export const BranchTypeRuleSchema = z.object({
  name: z.string(),
  prefix: z.string(),
  base: z.string().optional(),
  baseBranch: z.string().optional(),
  target: z.union([z.string(), z.array(z.string())]).optional(),
  mergeTargets: z.array(z.string()).optional(),
  deleteAfterFinish: z.boolean().optional(),
  deleteOnFinish: z.boolean().optional(),
  tag: z
    .union([
      z.boolean(),
      z.object({ prefix: z.string().optional(), pattern: z.string().optional() }),
    ])
    .optional(),
  autoTag: z.object({ prefix: z.string().optional(), pattern: z.string().optional() }).optional(),
  mergeStrategy: z.enum(["merge", "squash", "rebase"]).optional(),
  downstreamStrategy: z.enum(["merge", "rebase"]).optional(),
});

export const WorkflowSchema = z.object({
  version: z.number().optional(),
  workflow: z.string(),
  name: z.string().optional(),
  branches: z.record(z.string(), z.object({ protected: z.boolean().optional() })).optional(),
  types: z.record(z.string(), BranchTypeRuleSchema).optional(),
  branchTypes: z.array(BranchTypeRuleSchema).optional(),
  merge: z
    .object({
      strategy: z.enum(["merge", "squash", "rebase"]).optional(),
      deleteSource: z.boolean().optional(),
    })
    .optional(),
  tag: z
    .object({
      enabled: z.boolean().optional(),
      prefix: z.string().optional(),
    })
    .optional(),
  commit: z
    .object({
      conventional: z.object({ enabled: z.boolean().optional() }).optional(),
    })
    .optional(),
  branchNaming: z
    .object({
      case: z.enum(["kebab-case", "camelCase", "snake_case"]).optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  hooks: z
    .object({
      preStart: z.array(z.string()).optional(),
      postStart: z.array(z.string()).optional(),
      preFinish: z.array(z.string()).optional(),
      postFinish: z.array(z.string()).optional(),
    })
    .optional(),
  remote: z
    .object({
      remote: z.string().optional(),
      autoPush: z.boolean().optional(),
      autoPull: z.boolean().optional(),
    })
    .optional(),
});
