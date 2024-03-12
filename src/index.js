import path from "path";

import { setupCLI } from "./cli.js";
import { loadAndValidateConfig } from "./config.js";
import { TUI } from "./tui.js";

async function main() {
  const options = setupCLI();
  const configPath = options.config;
  const schemaPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "../schemas/config.schema.json",
  );

  try {
    const config = loadAndValidateConfig(configPath, schemaPath);
    const tui = new TUI();

    tui.updateDashboard("Initial dashboard content here. Update as needed.");

    setupUIWithConfig(tui, config);

    tui.screen.render();
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

function setupUIWithConfig(tui, config) {
  tui.projectsButton.on("press", () => {
    tui.showProjectsTable(config.projects);
  });

  tui.workspacesButton.on("press", () => {
    tui.showWorkspacesTable(config.workspaces);
  });
}

main();
