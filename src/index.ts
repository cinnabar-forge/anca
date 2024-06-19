import cinnabarData from "./cinnabar.js";
import { setupCli } from "./cli.js";
import { loadAndValidateConfig } from "./config.js";
import { createFolders } from "./git.js";
import { showMainMenu } from "./tui.js";

/**
 *
 */
async function main() {
  const options = setupCli(cinnabarData.version.text);

  try {
    loadAndValidateConfig(options.workfolder[0], options.config);

    await createFolders();

    showMainMenu();
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

main();
