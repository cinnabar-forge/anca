import { setupCli } from "./cli.js";
import {
  createFolders,
  getConfigFromGithub,
  loadAndValidateConfig,
  loadEmpty,
  loadProjects,
  readConfigFile,
} from "./config.js";
import { Anca } from "./schema.js";
import { showDevelopmentActions, showMainMenu } from "./tui.js";

/**
 *
 */
async function main() {
  try {
    let projects: Anca | null = null;
    const options = setupCli();
    if (options.project) {
      projects = await loadProjects(options.project);
    } else if (options.workfolder) {
      projects = loadAndValidateConfig(
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

    if (projects) {
      if (projects.deployments?.length || projects.developments?.length !== 1) {
        showMainMenu();
      } else {
        showDevelopmentActions(projects.developments[0]);
      }
    } else {
      console.error("No config file provided");
    }
  } catch (error: any) {
    console.error(`Failed to start Anca: ${error.message}`);
  }
}

main();
