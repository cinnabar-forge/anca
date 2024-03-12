import { program } from "commander";

export function setupCLI() {
  program
    .version("1.0.0")
    .description(
      "CLI tool for managing and validating project conventions and Git statuses.",
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
