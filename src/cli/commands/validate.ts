import { Command } from "commander";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseWorkflowConfig } from "../../domain/config/parse.js";
import { readConfigFile } from "../../infrastructure/config/loader.js";
import { ConfigError } from "../../domain/errors.js";
import { repositoryRoot } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, success, printStructured } from "../output.js";

export function registerValidateCommand(program: Command, globals: () => GlobalOptions): void {
  program
    .command("validate")
    .description("validate a workflow definition file")
    .argument("[file]", "path to the workflow definition file (default: found config)")
    .action(async (file?: string) => {
      const options = globals();
      let configPath: string;
      if (file) {
        configPath = resolve(options.cwd ?? process.cwd(), file);
        if (!existsSync(configPath)) {
          throw new ConfigError(`file not found: ${configPath}`);
        }
      } else {
        const root = await repositoryRoot(options.cwd ?? process.cwd());
        const loaded = await import("../context.js").then((m) => m.loadWorkflow(root, options));
        configPath = loaded.path;
      }

      try {
        const config = readConfigFile(configPath);
        // Also parse to validate structure
        parseWorkflowConfig(config);
        const data = { valid: true, path: configPath, workflow: config.name };
        if (options.format === "json" || options.format === "yaml") {
          printStructured(data, options.format!);
        } else {
          success(`"${configPath}" is a valid workflow definition (${config.name})`);
        }
      } catch (err) {
        const data = { valid: false, path: configPath, error: (err as Error).message };
        if (options.format === "json" || options.format === "yaml") {
          printStructured(data, options.format!);
        } else {
          print(style.red(`✗ "${configPath}" is invalid:`));
          print(`  ${(err as Error).message}`);
        }
        process.exitCode = 1;
      }
    });
}
