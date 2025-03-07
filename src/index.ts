import { CINNABAR_PROJECT_VERSION } from "./cinnabar.js";
import { setupCli } from "./cli.js";
import {
  createFolders,
  getConfigFromGithub,
  loadAndValidateConfig,
  loadEmpty,
  loadProjects,
  readConfigFile,
} from "./config.js";
import { doActionsOnDevelopments } from "./developments.js";
import type { Anca, AncaAction } from "./schema.js";
import { showDevelopmentActions, showMainMenu } from "./tui.js";

/**
 *
 */
async function main() {
  const printIntro = () => {
    const design1 = "=".repeat(4);
    const text = `${design1} Anca v${CINNABAR_PROJECT_VERSION} ${design1}`;
    const design2 = "=".repeat(text.length);
    console.log(`\n${design2}\n${text}\n${design2}`);
  };
  printIntro();
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
      if (options.action) {
        if (projects.developments?.length) {
          await doActionsOnDevelopments(
            options.action as AncaAction[],
            projects.developments,
          );
        } else {
          console.error("No developments available");
        }
      } else {
        if (
          projects.deployments?.length ||
          projects.developments?.length !== 1
        ) {
          await showMainMenu();
        } else {
          await showDevelopmentActions(projects.developments[0]);
        }
      }
    } else {
      console.error("No config file provided");
    }
  } catch (error) {
    console.error(
      `Failed to start Anca: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

main();
