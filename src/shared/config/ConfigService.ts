export interface CliSettings {
  emoji: boolean;
  color: boolean;
  quiet: boolean;
  json: boolean;
}

export class ConfigService {
  private static instance: ConfigService;
  private settings: CliSettings;

  private constructor() {
    this.settings = {
      emoji: true,
      color: true,
      quiet: false,
      json: false,
    };
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  set(settings: Partial<CliSettings>): void {
    Object.assign(this.settings, settings);
  }

  get(key: keyof CliSettings): boolean {
    return this.settings[key];
  }

  all(): CliSettings {
    return { ...this.settings };
  }
}
