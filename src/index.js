import fs from "fs";
import path from "path";

import { setupCli } from "./cli.js";
import { loadAndValidateConfig } from "./config.js";
import { GitWorkspaceManager } from "./git.js";
import { Tui } from "./tui.js";

async function main() {
  const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
  const schemaPath = path.join(
    scriptDirectory,
    "../schemas/config.schema.json",
  );

  const versionella = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.readFileSync(
      path.resolve(scriptDirectory, "..", "version.json"),
      "utf8",
    ),
  );
  versionella.versionText = `v${versionella.major}.${versionella.minor}.${versionella.patch}`;

  const options = setupCli(versionella.versionText);
  const configPath = options.config;

  try {
    const config = loadAndValidateConfig(
      options.workfolder,
      configPath,
      schemaPath,
    );
    config.versionella = versionella;

    const workspacesManager = new GitWorkspaceManager(config.workspaces);
    await workspacesManager.createWorkspaceFolders();
    // await workspacesManager.manageWorkspaces();

    new Tui(config, workspacesManager);
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

main();
