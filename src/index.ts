import { setupCli } from "./cli.js";
import {
  createFolders,
  getConfigFromGithub,
  loadAndValidateConfig,
  loadEmpty,
  loadProjects,
  readConfigFile,
} from "./config.js";
import { showMainMenu } from "./tui.js";

/**
 *
 */
async function main() {
  const options = setupCli();

  try {
    if (options.project) {
      await loadProjects(options.project);
    } else if (options.workfolder) {
      loadAndValidateConfig(
        options.workfolder[0],
        options.github
          ? getConfigFromGithub(options.github)
          : options.config
            ? readConfigFile(options.config[0])
            : {},
      );
      await createFolders(options.workfolder[0]);
    } else {
      loadEmpty();
    }

    showMainMenu();
  } catch (error: any) {
    throw new Error(`Failed to start Anca: ${error.message}`);
  }
}

main();
