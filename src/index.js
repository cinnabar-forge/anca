import path from "path";

import cinnabarData from "./cinnabar.js";
import { setupCli } from "./cli.js";
import { loadAndValidateConfig } from "./config.js";
import { GitManager } from "./git.js";
import { Tui } from "./tui.js";

async function main() {
  const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
  const schemaPath = path.join(
    scriptDirectory,
    "../schemas/config.schema.json",
  );

  const options = setupCli(cinnabarData.version.text);
  const configPath = options.config;

  try {
    const config = loadAndValidateConfig(
      options.workfolder,
      configPath,
      schemaPath,
    );

    const gitManager = new GitManager(config);
    await gitManager.createFolders();

    new Tui(config, gitManager);
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

main();
