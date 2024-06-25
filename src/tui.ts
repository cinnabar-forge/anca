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
    return [pc.bgRed("not presented locally")];
  }

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
      statuses.push(pc.bgCyan("edited"));
    }
  } else {
    statuses.push("non-git");
  }

  // if (development.convention != null) {
  //   const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
  //   const conventionPath = path.resolve(
  //     path.join(
  //       scriptDirectory,
  //       "..",
  //       "conventions",
  //       development.convention + ".js",
  //     ),
  //   );
  //   if (fs.existsSync(conventionPath)) {
  //     const { checkConventionAdherence } = await import(conventionPath);
  //     if (
  //       !(await checkConventionAdherence(
  //         development,
  //         path.dirname(conventionPath),
  //       ))
  //     ) {
  //       statuses.push("convention-broke");
  //     }
  //   }
  // }

  return statuses;
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
  const choice = await promptOptions("Play as:", options);
  console.log(`You chose: ${choice.label}`);
  showMainMenu();
}

/**
 *
 */
async function showAllProjects() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getState();

  for (const development of state.developments) {
    options.push({
      action: placeholderOptions,
      label: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
    });
  }

  await promptMenu("Select a project:", options);
}

/**
 *
 */
async function showNotHavingAncaJson() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getState();

  for (const development of state.developments) {
    if (
      (await checkExistence(development.fullPath)) &&
      !(await checkExistence(path.join(development.fullPath, "anca.json")))
    ) {
      options.push({
        action: placeholderOptions,
        label: getDevelopmentDisplayName(development),
      });
    }
  }

  await promptMenu("Select to create anca.json:", options);
}

/**
 *
 */
async function showPresentedLocally() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getState();

  for (const development of state.developments) {
    if (await checkExistence(development.fullPath)) {
      options.push({
        action: placeholderOptions,
        label: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
      });
    }
  }

  await promptMenu("Select:", options);
}

/**
 *
 */
async function showNotPresentedLocally() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getState();

  for (const development of state.developments) {
    if (!(await checkExistence(development.fullPath))) {
      options.push({
        action: async () => {
          await syncDevelopment(development, false, false, true);
        },
        label: getDevelopmentDisplayName(development),
      });
    }
  }

  await promptMenu("Select to clone:", options);
}

/**
 *
 */
async function showDevelopmentsMenu() {
  await promptMenu("\n[DEVELOPMENTS]", [
    { action: showMainMenu, label: "Back" },
    { action: placeholderOptions, label: "List of issues" },
    { action: showNotHavingAncaJson, label: "List of not having anca.json" },
    { action: showPresentedLocally, label: "List of presented locally" },
    { action: showNotPresentedLocally, label: "List of not presented locally" },
    { action: showAllProjects, label: "List of all projects" },
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
        console.log("Deployments selected");
        showMainMenu();
      },
      label: "Deployments",
    },
    { action: showDevelopmentsMenu, label: "Developments" },
  ]);
}
