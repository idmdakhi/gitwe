#!/usr/bin/env node
import { run } from "./program.js";
import { buildEngineDeps } from "./container.js";
import { Engine } from "../application/engine.js";
import { parseArgs } from "node:util";
import type { CliConfig } from "../domain/entities/workflow-config.entity.js";

void (async () => {
  // پارس کردن آرگومان‌های ساده برای دریافت --config و --cwd
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      config: { type: "string" },
      cwd: { type: "string" },
    },
    allowPositionals: true,
    strict: false,
  });

  // اطمینان از اینکه cwd یک رشته باشد
  const cwd = typeof values.cwd === "string" ? values.cwd : process.cwd();

  // ساخت آبجکت GlobalOptions با حذف config در صورت undefined بودن
  const deps = buildEngineDeps({
    cwd,
    // فقط در صورتی config را اضافه کن که مقدار داشته باشد
    ...(typeof values.config === "string" ? { config: values.config } : {}),
    color: true,
    verbose: false,
  });

  let cliConfig: CliConfig | undefined;

  try {
    const engine = await Engine.create(deps);
    cliConfig = engine.config.cli;
  } catch {
    // اگر فایل پیکربندی وجود نداشت، از پیش‌فرض‌ها استفاده می‌کنیم
    cliConfig = { enabled: true, interactive: true, color: true };
  }

  // اجرای برنامه با cliConfig
  const exitCode = await run(process.argv, cliConfig);
  process.exitCode = exitCode;
})();
