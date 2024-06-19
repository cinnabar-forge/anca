import { parseCli } from "clivo";

/**
 *
 * @param {string} versionText
 */
export function setupCli(versionText: string) {
  return parseCli({
    args: process.argv,
    options: [
      {
        name: "config",
        label: "Specify the path to the configuration file",
        letter: "c",
      },
      {
        name: "workfolder",
        label: "Specify the path to the main workfolder",
        letter: "w",
      },
    ],
  });
}
