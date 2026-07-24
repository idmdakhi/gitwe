export interface AppConfig {
  logLevel: "debug" | "info" | "warn" | "error";
  enableEmoji: boolean;
  enableColor: boolean;
  jsonOutput: boolean;
  // بعداً گسترش پیدا می‌کند
}

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadFromEnvAndDefaults();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadFromEnvAndDefaults(): AppConfig {
    return {
      logLevel: (process.env.GITWE_LOG_LEVEL as any) || "info",
      enableEmoji: process.env.GITWE_EMOJI !== "false",
      enableColor: process.env.GITWE_COLOR !== "false",
      jsonOutput: process.env.GITWE_JSON === "true",
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }
}
