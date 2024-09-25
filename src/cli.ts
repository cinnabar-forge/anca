import { parseCli } from "clivo";
import fs from "fs";

/**
 * Parses cli arguments
 * @returns Parsed arguments
 */
export function setupCli() {
  const cli = parseCli({
    args: process.argv,
    options: [
      {
        label: "Specify the actions to perform on all projects",
        letter: "a",
        name: "action",
      },
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

  const throwProjects = () => {
    throw new Error(
      "Please specify the projects to work on (--config, --github, --project)",
    );
  };

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

  if (cli.config == null && cli.github == null && cli.project == null) {
    const currentDir = process.cwd();

    if (fs.existsSync(`${currentDir}/anca.json`)) {
      cli.project = [currentDir];
    } else {
      throwProjects();
    }
  }

  return cli;
}
