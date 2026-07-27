// src/cli/commands/tag.ts (جدید)
program
  .command("tag <name>")
  .description("Create a git tag")
  .option("--message <msg>", "Tag message")
  .option("--push", "Push tag to remote")
  .action(async (name, opts) => {
    const result = await container.capabilities.run<TagInput, TagOutput>(
      "tag",
      { tag: name, message: opts.message, push: opts.push },
      context,
    );
    console.log(`✅ Tag ${result.tag} created${result.pushed ? " and pushed" : ""}`);
  });
