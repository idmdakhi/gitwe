import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ChangelogWriter } from "#gitwe/domain/ports/ChangelogWriter";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { Version } from "#gitwe/domain/valueObjects/Version";
import type { Logger } from "#gitwe/shared/logging/Logger";

export class ConventionalChangelogWriter implements ChangelogWriter {
  constructor(
    private readonly git: GitRepository,
    private readonly logger: Logger,
  ) {}

  async append(params: {
    version: Version;
    fromRef?: string;
    toRef?: string;
    path?: string;
  }): Promise<string> {
    const filePath = params.path ?? "CHANGELOG.md";
    const from = params.fromRef ?? (await this.getLastTag()) ?? "HEAD";
    const to = params.toRef ?? "HEAD";

    // Get commits between from and to
    const range = from === to ? "HEAD" : `${from}..${to}`;
    const commits = await this.getCommits(range);

    if (commits.length === 0) {
      this.logger.info("No commits to add to changelog.");
      return filePath;
    }

    const entry = this.formatEntry(params.version, commits);

    // Prepend to file
    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      // File doesn't exist
      content = "# Changelog\n\n";
    }

    const newContent = content.replace("# Changelog\n\n", `# Changelog\n\n${entry}\n`);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, newContent, "utf-8");

    return filePath;
  }

  private async getLastTag(): Promise<string | undefined> {
    try {
      const result = await this.git.runRaw(["describe", "--tags", "--abbrev=0"]);
      return result.stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  private async getCommits(
    range: string,
  ): Promise<Array<{ hash: string; message: string; author: string; date: string }>> {
    try {
      const result = await this.git.runRaw(["log", "--format=%H|%s|%an|%aI", range]);
      return result.stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [hash, message, author, date] = line.split("|");
          return { hash: hash!, message: message!, author: author!, date: date! };
        });
    } catch {
      return [];
    }
  }

  private formatEntry(
    version: Version,
    commits: Array<{ hash: string; message: string; author: string; date: string }>,
  ): string {
    const lines = [`## [${version.toString()}] - ${new Date().toISOString().slice(0, 10)}`, ""];

    const groups: Record<string, string[]> = {
      "🚀 Features": [],
      "🐛 Bug Fixes": [],
      "📖 Documentation": [],
      "🧹 Chores": [],
      "♻️ Refactors": [],
    };

    for (const commit of commits) {
      const msg = commit.message;
      let group = "🧹 Chores";
      if (msg.startsWith("feat")) group = "🚀 Features";
      else if (msg.startsWith("fix")) group = "🐛 Bug Fixes";
      else if (msg.startsWith("docs")) group = "📖 Documentation";
      else if (msg.startsWith("refactor")) group = "♻️ Refactors";

      groups[group]?.push(`- ${msg} (${commit.hash.slice(0, 7)})`);
    }

    for (const [heading, items] of Object.entries(groups)) {
      if (items.length > 0) {
        lines.push(`### ${heading}`);
        lines.push(...items);
        lines.push("");
      }
    }

    return lines.join("\n");
  }
}
