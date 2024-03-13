import { program } from "commander";

export function setupCli(versionText) {
  program
    .version(versionText, "-v, -V, --version")
    .description(
      "Organize your workspace and manage projects deploy fast and easy",
    )
    .requiredOption(
      "-c, --config <path>",
      "Specify the path to the configuration file",
    )
    .option(
      "-w, --workfolder <path>",
      "Specify the path to the main workfolder",
    );

  program.parse(process.argv);
  return program.opts();
}
