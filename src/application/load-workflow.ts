import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export interface LoadWorkflowOptions {
  root: string;

  config?: string;
}

export async function loadWorkflow(options: LoadWorkflowOptions) {
  const file =
    options.config == null
      ? resolve(options.root, "gitwe.json")
      : isAbsolute(options.config)
        ? options.config
        : resolve(options.root, options.config);

  if (!existsSync(file)) {
    throw new Error(`Workflow configuration not found: ${file}`);
  }

  return parseWorkflow(file);
}
