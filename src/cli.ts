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
        label: "GitHub repositories to use",
        letter: "g",
        name: "github",
      },
      {
        label: "Paths to specific project(s) (overrides --config)",
        letter: "p",
        name: "project",
      },
      {
        label: "Specify the path to the main workfolder",
        letter: "w",
        name: "workfolder",
      },
    ],
  });

  const throwWorkfolder = () => {
    throw new Error(
      "Please specify the path to the main workfolder (--workfolder)",
    );
  };

  // eslint-disable-next-line sonarjs/no-collapsible-if
  if (cli.github != null || cli.config != null) {
    if (cli.workfolder == null) {
      throwWorkfolder();
    }
  }

  return cli;
}
