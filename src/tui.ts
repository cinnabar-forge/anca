import { promptMenu, promptOptions } from "clivo";
import path from "path";
import pc from "picocolors";

import { getState } from "./config.js";
import { getGit, syncDevelopment } from "./git.js";
import { AncaDevelopmentState } from "./schema.js";
import { checkExistence, checkForGit } from "./utils.js";

// async function showDevelopmentActions(development) {
//   const title = development.name;
//   const options = [
//     { label: "Cancel", name: "cancel" },
//     {
//       label: "Refresh list",
//       name: "refresh",
//       refreshTable: true,
//     },
//     // {
//     //   callback: (option) => {
//     //     this.showInputBox(title, option.label, development.gitRepo, () => {});
//     //   },
//     //   label: "Change git repo",
//     //   name: "changeGitRepo",
//     // },
//     // {
//     //   callback: (option) => {
//     //     this.showInputBox(title, option.label, development.stack, () => {});
//     //   },
//     //   label: "Change stack",
//     //   name: "changeStack",
//     // },
//     // {
//     //   callback: (option) => {
//     //     this.showInputBox(
//     //       title,
//     //       option.label,
//     //       development.convention,
//     //       () => {},
//     //     );
//     //   },
//     //   label: "Change convention",
//     //   name: "changeConvention",
//     // },
//   ];
//   const statuses = await this.gitManager.getDevelopmentStatus(development);

//   for (const status of statuses) {
//     if (development.gitRepo != null) {
//       if (status === "-") {
//         options.push({
//           callback: (option) => {
//             this.showConfirmationPopup(
//               title,
//               option.label,
//               this.developmentsTable,
//               async () => {
//                 await this.gitManager.syncDevelopment(
//                   development,
//                   false,
//                   false,
//                   true,
//                 );
//               },
//             );
//           },
//           label: "Clone",
//           name: "cloneGitRepo",
//           refreshTable: true,
//         });
//       } else if (status === "synced" || status === "sync-pending") {
//         options.push({
//           callback: (option) => {
//             this.showConfirmationPopup(
//               title,
//               option.label,
//               this.developmentsTable,
//               async () => {
//                 await this.gitManager.syncDevelopment(
//                   development,
//                   true,
//                   false,
//                   false,
//                 );
//               },
//             );
//           },
//           label: "Fetch updates",
//           name: "fetchGitRepo",
//           refreshTable: true,
//         });
//       }
//     }
//   }

//   options.push({
//     callback: (option) => {
//       this.showConfirmationPopup(
//         title,
//         option.label,
//         this.developmentsTable,
//         async () => {
//           await this.gitManager.manageDevelopments(null, true);
//         },
//       );
//     },
//     label: "Fetch updates for all",
//     name: "fetchAllGitRepos",
//     refreshTable: true,
//   });

//   const issues = await checkForConvention(development, true);

//   this.showListPopup(title, [...options, ...issues]);
// }

/**
 *
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
 *
 * @param development
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
          await syncDevelopment(development, false, false, true);
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
 *
 * @param development
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
