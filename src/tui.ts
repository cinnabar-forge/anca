import { promptMenu } from "clivo";

import { fixAncaConfig } from "./actions/anca.js";
import { getState } from "./config.js";
import {
  clearDevelopmentDevelopmentCache,
  createAncaJson,
  getDevelopmentDisplayName,
  getDevelopmentPack,
  getDevelopmentStatus,
  syncDevelopment,
} from "./developments.js";
import { AncaDevelopmentState } from "./schema.js";
import { checkExistence } from "./utils.js";

interface ClivoAction {
  action: () => Promise<void>;
  label: string;
}

/**
 *
 * @param development
 * @param previousMenu
 */
async function showDevelopmentActions(
  development: AncaDevelopmentState,
  previousMenu: () => Promise<void>,
) {
  const menu = [{ action: previousMenu, label: "Back" }];

  const backHere = async () => {
    clearDevelopmentDevelopmentCache(development);
    await showDevelopmentActions(development, previousMenu);
  };

  const pack = await getDevelopmentPack(development);

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
        const ancaConfig = pack.jsons["anca.json"];
        await fixAncaConfig(ancaConfig);
        await createAncaJson(development, ancaConfig);
        await backHere();
      },
      label: "[anca.json] Fix",
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
      console.log("[WARNING] No mapping found for code:", code);
    }
  };

  pack.issues.forEach(map);
  pack.actions.forEach(map);

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
