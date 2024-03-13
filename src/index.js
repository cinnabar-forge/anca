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

  const version = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.readFileSync(
      path.resolve(scriptDirectory, "..", "version.json"),
      "utf8",
    ),
  );
  version.versionText = `v${version.major}.${version.minor}.${version.patch}`;

  const options = setupCli(version.versionText);
  const configPath = options.config;

  try {
    const config = loadAndValidateConfig(
      options.workfolder,
      configPath,
      schemaPath,
    );
    config.version = version;

    const workspacesManager = new GitWorkspaceManager(config.workspaces);
    await workspacesManager.createWorkspaceFolders();
    // await workspacesManager.manageWorkspaces();

    new Tui(config, workspacesManager);
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

main();
