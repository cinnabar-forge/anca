import { parseCli } from "clivo";

/**
 * Parses cli arguments
 * @returns Parsed arguments
 */
export function setupCli() {
  return parseCli({
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
}
