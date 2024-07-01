import { parseCli } from "clivo";

/**
 * Parses cli arguments
 * @returns Parsed arguments
 */
export function setupCli() {
  const cli = parseCli({
    args: process.argv,
    options: [
      {
        label: "Specify the path to the workfolder files",
        letter: "c",
        name: "config",
      },
      {
        label: "Specify the path to the main workfolder",
        letter: "w",
        name: "workfolder",
      },
    ],
  });

  if (cli.config == null) {
    throw new Error(
      "Please specify the path to the workfolder files (--config)",
    );
  }

  if (cli.workfolder == null) {
    throw new Error(
      "Please specify the path to the main workfolder (--workfolder)",
    );
  }

  return cli;
}
