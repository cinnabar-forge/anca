import { promptMenu } from "clivo";

import { fixAncaConfig } from "./actions/anca.js";
import {
  fixDevcontainerDockerfile,
  fixDevcontainerJson,
} from "./actions/devcontainers.js";
import {
  fixGithubActionsOtherFiles,
  fixGithubActionsRelease,
  fixGithubActionsTest,
} from "./actions/github-actions.js";
import cinnabarData from "./cinnabar.js";
import { getInstance } from "./config.js";
import {
  createAncaJson,
  getDevelopmentDisplayName,
  getDevelopmentStatus,
  refreshDevelopmentState,
  syncDevelopment,
} from "./developments.js";
import { AncaDevelopment } from "./schema.js";
import { checkExistence } from "./utils.js";

interface ClivoAction {
  action: () => Promise<void>;
  label: string;
}

const APP_NAME_AND_VERSION = `${cinnabarData.name.toLocaleUpperCase()} v${cinnabarData.version.text}`;

/**
 *
 * @param development
 * @param previousMenu
 */
async function showDevelopmentActions(
  development: AncaDevelopment,
  previousMenu: () => Promise<void>,
) {
  const menu = [{ action: previousMenu, label: "Back" }];

  const backHere = async () => {
    development.state = undefined;
    await showDevelopmentActions(development, previousMenu);
  };

  await refreshDevelopmentState(development);

  if (development.state == null) {
    console.log("Development state is not available");
    return;
  }

  const state = development.state;

  const mappings: Record<string, ClivoAction> = {
    ancaJsonCreate: {
      action: async () => {
        const ancaConfig = {};
        await fixAncaConfig(ancaConfig);
        await createAncaJson(development, ancaConfig);
        await backHere();
      },
      label: "[anca.json] Create",
    },
    ancaJsonFix: {
      action: async () => {
        await fixAncaConfig(state.config);
        await createAncaJson(development, state.config);
        await backHere();
      },
      label: "[anca.json] Fix",
    },
    devcontainerDockerfileSetToDefault: {
      action: async () => {
        await fixDevcontainerDockerfile(development, state);
        await backHere();
      },
      label: "[.devcontainer/Dockerfile] Set to default",
    },
    devcontainerJsonSetToDefault: {
      action: async () => {
        await fixDevcontainerJson(development, state);
        await backHere();
      },
      label: "[.devcontainer/devcontainer.json] Set to default",
    },
    gitClone: {
      action: async () => {
        await syncDevelopment(development);
        await backHere();
      },
      label: "[git] Clone",
    },
    gitIgnoreCreate: {
      action: async () => {
        // Implementation for creating .gitignore
        await backHere();
      },
      label: "[.gitignore] Create",
    },
    githubActionsOtherFilesRemove: {
      action: async () => {
        await fixGithubActionsOtherFiles(development);
        await backHere();
      },
      label: "[.github/workflows] Remove other files",
    },
    githubActionsReleaseSetToDefault: {
      action: async () => {
        await fixGithubActionsRelease(development, state);
        await backHere();
      },
      label: "[.github/workflows/release.yml] Set to default",
    },
    githubActionsTestSetToDefault: {
      action: async () => {
        await fixGithubActionsTest(development);
        await backHere();
      },
      label: "[.github/workflows/test.yml] Set to default",
    },
    licenseCreate: {
      action: async () => {
        // Implementation for creating LICENSE file
        await backHere();
      },
      label: "[LICENSE] Create",
    },
    nodejsEslintCreate: {
      action: async () => {
        // Implementation for creating ESLint config for Node.js projects
        await backHere();
      },
      label: "[Node.js] Create ESLint Config",
    },
    nodejsPrettierIgnoreCreate: {
      action: async () => {
        // Implementation for creating .prettierignore for Node.js projects
        await backHere();
      },
      label: "[Node.js] Create Prettier Ignore",
    },
    nodejsPrettierRcCreate: {
      action: async () => {
        // Implementation for creating Prettier config for Node.js projects
        await backHere();
      },
      label: "[Node.js] Create Prettier Config",
    },
    packageJsonKeywordsUpdate: {
      action: async () => {
        // Implementation for updating keywords in package.json
        await backHere();
      },
      label: "[package.json] Update Keywords",
    },
    readmeCreate: {
      action: async () => {
        // Implementation for creating README.md
        await backHere();
      },
      label: "[README.md] Create",
    },
  };

  const map = (code: string) => {
    const mapping = mappings[code];
    if (mapping) {
      menu.push({
        action: mapping.action,
        label: mapping.label,
      });
    } else {
      menu.push({
        action: async () => {
          await backHere();
        },
        label: "THE ACTION IS NOT IMPMLEMENTED: " + code,
      });
    }
  };

  state.issues.forEach(map);
  state.actions.forEach(map);

  await promptMenu(
    `\n[${development.data.name.toUpperCase()} at ${development.data.folder.toUpperCase()}] (${(await getDevelopmentStatus(development)).join(", ")})`,
    menu,
  );
}

/**
 *
 */
async function showAllDevelopments() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getInstance();

  for (const development of state.developments) {
    options.push({
      action: async () => {
        showDevelopmentActions(development, showAllDevelopments);
      },
      label: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
    });
  }

  await promptMenu("\n[ALL DEVELOPMENTS]", options);
}

/**
 *
 */
async function showLocalDevelopments() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getInstance();

  for (const development of state.developments) {
    if (await checkExistence(development.fullPath)) {
      options.push({
        action: async () => {
          showDevelopmentActions(development, showLocalDevelopments);
        },
        label: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
      });
    }
  }

  await promptMenu("\n[LOCAL DEVELOPMENTS]", options);
}

/**
 *
 */
async function showDevelopmentsMenu() {
  await promptMenu("\n[DEVELOPMENTS]", [
    { action: showMainMenu, label: "Back" },
    { action: showLocalDevelopments, label: "List of local developments" },
    { action: showAllDevelopments, label: "List of all developments" },
  ]);
}

/**
 *
 */
export async function showMainMenu() {
  await promptMenu(`\n[${APP_NAME_AND_VERSION}]`, [
    {
      action: async () => {
        console.log("Bye.");
      },
      label: "Quit",
    },
    {
      action: async () => {
        console.log("off");
      },
      label: "Deployments",
    },
    { action: showDevelopmentsMenu, label: "Developments" },
  ]);
}
