import { promptMenu } from "clivo";
import pc from "picocolors";

import { getAction } from "./action.js";
import { getInstance } from "./config.js";
import {
  getDevelopmentDisplayName,
  getDevelopmentStatus,
  refreshDevelopmentState,
} from "./developments.js";
import type { AncaAction, AncaDevelopment } from "./schema.js";
import { checkExistence } from "./utils.js";

/**
 *
 * @param development
 * @param previousMenu
 */
export async function showDevelopmentActions(
  development: AncaDevelopment,
  previousMenu?: () => Promise<void>,
) {
  const menu = previousMenu ? [{ action: previousMenu, label: "Back" }] : [];

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

  const map = (code: AncaAction, isIssue: boolean) => {
    const mapping = getAction(code);
    if (mapping) {
      menu.push({
        action: async () => {
          await mapping.action(development);
          await backHere();
        },
        label: isIssue ? `${pc.bgRed("[!]")} ${mapping.label}` : mapping.label,
      });
    } else {
      menu.push({
        action: backHere,
        label: `THE ACTION IS NOT IMPLEMENTED: ${code}`,
      });
    }
  };

  for (const code of state.issues) {
    map(code, true);
  }
  for (const code of state.actions) {
    map(code, false);
  }

  await promptMenu(
    development.data?.name && development.data?.owner
      ? `\n[${development.data.name.toUpperCase()} at ${development.data.owner.toUpperCase()}] (${(await getDevelopmentStatus(development)).join(", ")})`
      : `\n[${development.fullPath}] (${(await getDevelopmentStatus(development)).join(", ")})`,
    menu,
  );
}

/**
 *
 */
async function showAllDevelopments() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getInstance();

  for (const development of state.developments || []) {
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

  for (const development of state.developments || []) {
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
async function showProblematicLocalDevelopments() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getInstance();

  for (const development of state.developments || []) {
    if (await checkExistence(development.fullPath)) {
      await refreshDevelopmentState(development);
      if (development.state != null && development.state.issues.length > 0) {
        options.push({
          action: async () => {
            showDevelopmentActions(
              development,
              showProblematicLocalDevelopments,
            );
          },
          label: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
        });
      }
    }
  }

  await promptMenu("\n[PROBLEMATIC LOCAL DEVELOPMENTS]", options);
}

/**
 *
 */
async function showDevelopmentsMenu() {
  await promptMenu("\n[DEVELOPMENTS]", [
    { action: showMainMenu, label: "Back" },
    {
      action: showProblematicLocalDevelopments,
      label: "List of problematic developments",
    },
    { action: showLocalDevelopments, label: "List of local developments" },
    { action: showAllDevelopments, label: "List of all developments" },
  ]);
}

/**
 *
 */
export async function showMainMenu() {
  await promptMenu("\n[Main menu]", [
    {
      action: async () => {
        console.log("Bye.");
      },
      label: "Quit",
    },
    {
      action: async () => {
        showMainMenu();
      },
      label: "Deployments",
    },
    { action: showDevelopmentsMenu, label: "Developments" },
  ]);
}
