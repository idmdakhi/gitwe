import type { Version } from "#gitwe/domain/valueObjects/Version";

export interface ChangelogWriter {
  append(params: {
    version: Version;
    fromRef?: string;
    toRef?: string;
    path?: string;
  }): Promise<string>;
}
