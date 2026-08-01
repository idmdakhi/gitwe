#!/usr/bin/env node
import { buildProgram } from "#gitwe/cli/program";
import { DomainError } from "#gitwe/domain/errors/index";
import { failure } from "#gitwe/cli/format";

async function main(): Promise<void> {
  const program = await buildProgram();
  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  if (error instanceof DomainError) {
    failure(error.message);
    if (process.env["GITWE_DEBUG"]) console.error(error.stack);
    process.exitCode = 1;
    return;
  }
  failure(error instanceof Error ? error.message : String(error));
  if (process.env["GITWE_DEBUG"] && error instanceof Error) console.error(error.stack);
  process.exitCode = 1;
});
