export interface Plugin {
  readonly id: string;

  readonly name: string;

  readonly version: string;

  readonly description: string;

  install(context: PluginContext): Promise<void>;
}
