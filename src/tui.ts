import { promptMenu, promptOptions } from "clivo";
import path from "path";
import pc from "picocolors";

import { getState } from "./config.js";
import { getGit, syncDevelopment } from "./git.js";
import { AncaDevelopmentState } from "./schema.js";
import { checkExistence, checkForGit } from "./utils.js";

/**
 * Gets development display name
 * @param development
 */
function getDevelopmentDisplayName(development: AncaDevelopmentState): string {
  return `${development.data.name}${pc.dim("@" + development.data.folder)}`;
}

/**
 *
 * @param development
 */
async function getDevelopmentStatus(development: AncaDevelopmentState) {
  const exists = await checkExistence(development.fullPath);
  if (!exists) {
    return [pc.bgRed("remote")];
  }

  const hasAncaJson =
    (await checkExistence(development.fullPath)) &&
    (await checkExistence(path.join(development.fullPath, "anca.json")));

  const statuses = [];

  const gitExists = await checkForGit(development.fullPath);
  if (gitExists) {
    await getGit().cwd(development.fullPath);
    const statusSummary = await getGit().status();

    statuses.push(
      statusSummary.behind > 0 || statusSummary.ahead > 0
        ? pc.bgYellow("sync-pending")
        : pc.bgGreen("synced"),
    );

    if (statusSummary.files.length > 0) {
      statuses.push(pc.bgMagenta("edited"));
    }
  } else {
    statuses.push("non-git");
  }

  if (!hasAncaJson) {
    statuses.push(pc.bgCyan("non-anca"));
  }

  return statuses;
}

/**
 * Gets development actions
 * @param development
 * @param previousMenu
 */
async function getDevelopmentActions(
  development: AncaDevelopmentState,
  previousMenu: () => Promise<void>,
) {
  const exists = await checkExistence(development.fullPath);
  if (!exists) {
    return [
      {
        action: async () => {
          await syncDevelopment(development);
          await showDevelopmentAction(development, previousMenu);
        },
        label: "Clone",
      },
    ];
  }

  const hasAncaJson =
    (await checkExistence(development.fullPath)) &&
    (await checkExistence(path.join(development.fullPath, "anca.json")));

  const actions = [];

  if (!hasAncaJson) {
    actions.push({
      action: placeholderOptions,
      label: "Create anca.json",
    });
  }

  return actions;
}

/**
 *
 */
async function placeholderOptions() {
  const options = [
    { label: "Shrek", name: "shrek" },
    { label: "Fiona", name: "fiona" },
    { label: "Donkey", name: "donkey" },
  ];
  const choice = await promptOptions("[SHREK CHARACTERS]", options);
  console.log(`You chose: ${choice.label}`);
  showMainMenu();
}

/**
 * Shows Clivo menu with development actions
 * @param development
 * @param previousMenu
 */
async function showDevelopmentAction(
  development: AncaDevelopmentState,
  previousMenu: () => Promise<void>,
) {
  const actions = [{ action: previousMenu, label: "Back" }];

  actions.push(...(await getDevelopmentActions(development, previousMenu)));

  await promptMenu(
    `\n[${development.data.name.toUpperCase()} at ${development.data.folder.toUpperCase()}]`,
    actions,
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
        showDevelopmentAction(development, showAllDevelopments);
      },
      label: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
    });
  }

  await promptMenu("[ALL DEVELOPMENTS]", options);
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
          showDevelopmentAction(development, showLocalDevelopments);
        },
        label: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
      });
    }
  }

  await promptMenu("[LOCAL DEVELOPMENTS]", options);
}

/**
 *
 */
async function showDevelopmentsMenu() {
  await promptMenu("\n[DEVELOPMENTS]", [
    { action: showMainMenu, label: "Back" },
    { action: placeholderOptions, label: "List of issues" },
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
      action: placeholderOptions,
      label: "Deployments",
    },
    { action: showDevelopmentsMenu, label: "Developments" },
  ]);
}
