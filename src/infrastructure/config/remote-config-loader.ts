// src/infrastructure/config/remote-config-loader.ts
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type {
  BaseRemoteOverrides,
  RemoteConfig,
  RemoteOverride,
  TypeRemoteOverrides,
} from "../../domain/entities/remote-config.entity.js";
import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";
import type { PushOptions } from "../../domain/ports/git-repository.port.js";
import { omitUndefined } from "../../utils.js";

export interface RemoteConfigLoaderOptions {
  root: string;
  mainConfig: WorkflowConfig;
  explicitFile?: string;
}

export class RemoteConfigLoader {
  async load(options: RemoteConfigLoaderOptions): Promise<RemoteConfig> {
    const { root, mainConfig, explicitFile } = options;
    const mainRemote = mainConfig.remote ?? {
      default: "origin",
      fetch: ["origin"],
      push: ["origin"],
      autoFetch: true,
      autoPush: false,
    };

    let filePath = explicitFile ?? mainRemote.config ?? ".gitwe/remote.yaml";
    filePath = join(root, filePath);

    let fileConfig: any = {};
    if (existsSync(filePath)) {
      const raw = await readFile(filePath, "utf8");
      fileConfig = yaml.load(raw) as any;
      fileConfig = this.normalizeKeys(fileConfig);
    }

    // ادغام سطح پایه
    const merged: RemoteConfig = {
      default: fileConfig.default ?? mainRemote.default ?? "origin",
      fetch: fileConfig.fetch ?? mainRemote.fetch ?? ["origin"],
      push: fileConfig.push ?? mainRemote.push ?? ["origin"],
      autoFetch: fileConfig.autoFetch ?? mainRemote.autoFetch ?? true,
      autoPush: fileConfig.autoPush ?? mainRemote.autoPush ?? false,
      pushOptions: this.mergePushOptions(fileConfig.pushOptions, mainRemote.pushOptions),
      baseOverrides: this.mergeOverrides(fileConfig.baseOverrides, mainRemote.baseOverrides),
      typeOverrides: this.mergeOverrides(fileConfig.typeOverrides, mainRemote.typeOverrides),
    };

    // ادغام baseOverrides و typeOverrides
    merged.baseOverrides = this.mergeOverrides(fileConfig.baseOverrides, mainRemote.baseOverrides);
    merged.typeOverrides = this.mergeOverrides(fileConfig.typeOverrides, mainRemote.typeOverrides);

    // یکتا سازی آرایه‌ها
    merged.fetch = [...new Set(merged.fetch)];
    merged.push = [...new Set(merged.push)];

    return merged;
  }

  private normalizeKeys(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[newKey] = value;
    }
    return result;
  }

  private mergePushOptions(base?: PushOptions, override?: PushOptions): PushOptions | undefined {
    if (!base && !override) return undefined;
    return {
      forceWithLease: override?.forceWithLease ?? base?.forceWithLease ?? false,
      followTags: override?.followTags ?? base?.followTags ?? true,
      force: override?.force ?? base?.force,
      setUpstream: override?.setUpstream ?? base?.setUpstream,
      delete: override?.delete ?? base?.delete,
    } as PushOptions | undefined;
  }

  private mergeOverrides(
    fileOverrides: any,
    mainOverrides: any,
  ): BaseRemoteOverrides | TypeRemoteOverrides | undefined {
    const result: BaseRemoteOverrides | TypeRemoteOverrides = {};

    const apply = (overrides: any) => {
      for (const [key, value] of Object.entries(overrides)) {
        if (key === "pushOptions") {
          // ادغام pushOptions سطح گروه (value از نوع unknown است)
          const currentPushOpts = (result as any).pushOptions;
          (result as any).pushOptions = this.mergePushOptions(
            currentPushOpts,
            value as PushOptions | undefined,
          );
        } else {
          // ادغام override هر شاخه
          const current = (result as any)[key] as RemoteOverride | undefined;
          const newOverride: RemoteOverride = {
            ...current,
            ...(value as object),
            pushOptions: this.mergePushOptions(current?.pushOptions, (value as any)?.pushOptions),
          };
          (result as any)[key] = newOverride;
        }
      }
    };

    if (fileOverrides) apply(fileOverrides);
    if (mainOverrides) apply(mainOverrides);

    return Object.keys(result).length > 0 ? result : undefined;
  }
}
