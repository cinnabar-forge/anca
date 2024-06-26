import { setupCli } from "./cli.js";
import { createFolders, loadAndValidateConfig } from "./config.js";
import { showMainMenu } from "./tui.js";

/**
 *
 */
async function main() {
  const options = setupCli();

  try {
    loadAndValidateConfig(options.workfolder[0], options.config);

    await createFolders();

    showMainMenu();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new Error(`Failed to start Anca: ${error.message}`);
  }
}

main();
