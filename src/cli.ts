import { parseCli } from "clivo";

/**
 *
 */
export function setupCli() {
  return parseCli({
    args: process.argv,
    options: [
      {
        label: "Specify the path to the configuration file",
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
