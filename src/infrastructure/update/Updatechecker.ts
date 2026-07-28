import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  isOutdated: boolean;
}

interface CacheEntry {
  checkedAt: string; // ISO timestamp
  latestVersion: string;
}

const DEFAULT_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // don't hit the registry more than once a day
const DEFAULT_FETCH_TIMEOUT_MS = 1500;

export interface UpdateCheckerOptions {
  /** npm package name to check. Defaults to `"gitwe"`. */
  packageName?: string;
  /** Where to cache the last-seen latest version, so most runs don't hit the network at all. */
  cachePath?: string;
  /** Minimum time between registry lookups. Defaults to 24h. */
  checkIntervalMs?: number;
  /** Abort the registry request after this long. Defaults to 1.5s. */
  fetchTimeoutMs?: number;
}

/**
 * Checks whether a newer version of gitwe has been published to npm, purely
 * for informational purposes — it never installs anything itself (see
 * `registerInitCommand`'s sibling discussion: actually replacing files is
 * left to `npm install -g gitwe@latest`, which already knows how to do that
 * safely across package managers).
 *
 * Designed to never be the reason a command is slow or fails: every network
 * or filesystem error resolves to `null` instead of throwing, and results
 * are cached so most invocations skip the network entirely.
 */
export class UpdateChecker {
  private readonly packageName: string;
  private readonly cachePath: string;
  private readonly checkIntervalMs: number;
  private readonly fetchTimeoutMs: number;

  constructor(options: UpdateCheckerOptions = {}) {
    this.packageName = options.packageName ?? "gitwe";
    this.cachePath =
      options.cachePath ?? path.join(os.homedir(), `.${this.packageName}-update-check.json`);
    this.checkIntervalMs = options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS;
    this.fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  }

  /**
   * Compares `currentVersion` against the latest version on npm. Returns
   * `null` (never throws) if the latest version couldn't be determined —
   * e.g. offline, registry unreachable, or nothing cached yet.
   */
  async check(currentVersion: string): Promise<UpdateCheckResult | null> {
    const latestVersion = await this.getLatestVersion();
    if (!latestVersion) return null;
    return {
      currentVersion,
      latestVersion,
      isOutdated: compareVersions(currentVersion, latestVersion) < 0,
    };
  }

  /** The latest published version, from cache if it's fresh enough, otherwise from the registry. */
  async getLatestVersion(): Promise<string | null> {
    const cached = this.readCache();
    if (cached && Date.now() - Date.parse(cached.checkedAt) < this.checkIntervalMs) {
      return cached.latestVersion;
    }

    const fetched = await this.fetchLatestVersion();
    if (fetched) {
      this.writeCache({ checkedAt: new Date().toISOString(), latestVersion: fetched });
      return fetched;
    }
    // Registry lookup failed (or timed out) — fall back to a stale cache entry rather than nothing.
    return cached?.latestVersion ?? null;
  }

  private async fetchLatestVersion(): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.fetchTimeoutMs);
    try {
      const res = await fetch(`https://registry.npmjs.org/${this.packageName}/latest`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { version?: unknown };
      return typeof data.version === "string" ? data.version : null;
    } catch {
      return null; // offline, DNS failure, timeout, registry down — all non-fatal for a notifier
    } finally {
      clearTimeout(timeout);
    }
  }

  private readCache(): CacheEntry | null {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(this.cachePath, "utf-8"));
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as CacheEntry).checkedAt === "string" &&
        typeof (parsed as CacheEntry).latestVersion === "string"
      ) {
        return parsed as CacheEntry;
      }
      return null;
    } catch {
      return null;
    }
  }

  private writeCache(entry: CacheEntry): void {
    try {
      fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
      fs.writeFileSync(this.cachePath, JSON.stringify(entry), "utf-8");
    } catch {
      // Best-effort cache only (e.g. a read-only home dir); a failed write just means
      // the next command will hit the network again, which is harmless.
    }
  }
}

/** Compares two `"x.y.z"`-style version strings. Negative if `a < b`, 0 if equal, positive if `a > b`. */
export function compareVersions(a: string, b: string): number {
  const partsOf = (v: string): number[] => v.replace(/^v/, "").split(".").map(Number);
  const [pa, pb] = [partsOf(a), partsOf(b)];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
