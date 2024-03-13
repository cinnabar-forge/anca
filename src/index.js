import path from "path";

import { setupCli } from "./cli.js";
import { loadAndValidateConfig } from "./config.js";
import { GitWorkspaceManager } from "./git.js";
import { Tui } from "./tui.js";

async function main() {
  const options = setupCli();
  const configPath = options.config;
  const schemaPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "../schemas/config.schema.json",
  );

  try {
    const config = loadAndValidateConfig(
      options.workfolder,
      configPath,
      schemaPath,
    );

    const workspacesManager = new GitWorkspaceManager(config.workspaces);
    await workspacesManager.createWorkspaceFolders();
    // await workspacesManager.manageWorkspaces();

    new Tui(config, workspacesManager);
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

main();
