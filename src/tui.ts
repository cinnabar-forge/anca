import { promptMenu, promptOptions } from "clivo";

import { getState } from "./config.js";
import {
  createAncaJson,
  getDevelopmentActions,
  getDevelopmentDisplayName,
  getDevelopmentStatus,
  syncDevelopment,
} from "./developments.js";
import {
  AncaConfigStack,
  AncaConfigType,
  AncaDevelopmentState,
} from "./schema.js";
import { checkExistence } from "./utils.js";

/**
 * Shows Clivo menu with development actions
 * @param development
 * @param previousMenu
 */
async function showDevelopmentActions(
  development: AncaDevelopmentState,
  previousMenu: () => Promise<void>,
) {
  const menu = [{ action: previousMenu, label: "Back" }];

  const backHere = async () => {
    await showDevelopmentActions(development, previousMenu);
  };

  const actionCodes = await getDevelopmentActions(development);

  if (actionCodes.ancaJsonCreate) {
    menu.push({
      action: async () => {
        const projectType = await promptOptions("Choose project type:", [
          { label: "App", name: "app" },
          { label: "Library", name: "library" },
          { label: "Other", name: "other" },
        ]);

        const projectStack = await promptOptions("Choose project stack:", [
          { label: "Nodejs", name: "nodejs" },
          { label: "Python", name: "python" },
          { label: "Other", name: "other" },
        ]);

        await createAncaJson(
          development,
          projectType.name as AncaConfigType,
          projectStack.name as AncaConfigStack,
        );
        await backHere();
      },
      label: "[anca.json] Create",
    });
  }

  if (actionCodes.gitClone) {
    menu.push({
      action: async () => {
        await syncDevelopment(development);
        await backHere();
      },
      label: "[git] Clone",
    });
  }

  if (actionCodes.gitIgnoreCreate) {
    menu.push({
      action: async () => {
        console.log("off");
        await backHere();
      },
      label: "[.gitignore] Create",
    });
  }

  if (actionCodes.license) {
    menu.push({
      action: async () => {
        console.log("off");
        await backHere();
      },
      label: "[LICENSE] Create",
    });
  }

  if (actionCodes.nodejsEslintCreate) {
    menu.push({
      action: async () => {
        console.log("off");
        await backHere();
      },
      label: "[eslint.config.js] Create",
    });
  }

  if (actionCodes.nodejsPrettierIgnoreCreate) {
    menu.push({
      action: async () => {
        console.log("off");
        await backHere();
      },
      label: "[.prettierignore] Create",
    });
  }

  if (actionCodes.nodejsPrettierRcCreate) {
    menu.push({
      action: async () => {
        console.log("off");
        await backHere();
      },
      label: "[.prettierrc] Create",
    });
  }

  if (actionCodes.packageJsonKeywords) {
    menu.push({
      action: async () => {
        console.log("off");
        await backHere();
      },
      label: "[package.json] Add 'keywords'",
    });
  }

  if (actionCodes.readmeCreate) {
    menu.push({
      action: async () => {
        console.log("off");
        await backHere();
      },
      label: "[README.md] Create",
    });
  }

  await promptMenu(
    `\n[${development.data.name.toUpperCase()} at ${development.data.folder.toUpperCase()}]`,
    menu,
  );
}

/**
 *
 */
async function showAllDevelopments() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getState();

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

  const state = getState();

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
    {
      action: async () => {
        console.log("off");
      },
      label: "List of issues",
    },
    { action: showLocalDevelopments, label: "List of local developments" },
    { action: showAllDevelopments, label: "List of all developments" },
  ]);
}

/**
 *
 */
export async function showMainMenu() {
  await promptMenu("\n[MAIN MENU]", [
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
