// export function ConfigCommand(): void {
//   program
//     .command("config")
//     .description("inspect and edit the workflow definition");

//     .command("list")
//     .description("show the current workflow definition")

//     .command("add")
//     .description("add a base branch or branch type")
//     .argument("<kind>", "base or branchType")
//     .argument("<name>", "branch or branch type name")
//     .argument("[base]", "parent base branch for branch type, or base for base branch");
//     .option("--prefix <prefix>", "branch prefix (for branch types)")
//     .option("--target <target>", "target branch(es) (comma-separated for multiple)")
//     .option("--aliases <aliases>", "comma-separated aliases")
//     .option("--protected", "mark base branch as protected")
//
//     .command("edit")
//     .description("edit a base branch or branch type")
//     .argument("<kind>", "base or branchType")
//     .argument("<name>", "branch or branch type name");
//     .option("--base <branch>", "new base branch")
//     .option("--prefix <prefix>", "new prefix (for branch types)")
//     .option("--target <target>", "new target branch(es) (comma-separated)")
//     .option("--aliases <aliases>", "new aliases (comma-separated)")
//     .option("--protected", "set protected (for base branches)")
//     .option("--no-protected", "remove protected")
//
//     .command("rename")
//     .description("rename a base branch or branch type")
//     .argument("<kind>", "base or branchType")
//     .argument("<from>", "current name")
//     .argument("<to>", "new name")
//
//     .command("delete")
//     .description("remove a base branch or branch type from the definition")
//     .argument("<kind>", "base or branchType")
//     .argument("<name>", "branch or branch type name")
//
