import fs from "fs";
import path from "path";
import pc from "picocolors";

import { promptMenu, promptOptions } from "clivo";
import { getState } from "./config.js";
import { AncaDevelopmentState } from "./schema.js";
import { checkExistence, checkForGit } from "./utils.js";
import { getGit, syncDevelopment } from "./git.js";

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

function getDevelopmentDisplayName(development: AncaDevelopmentState): string {
  return `${development.data.name}${pc.dim("@" + development.data.folder)}`;
}

async function getDevelopmentStatus(development: AncaDevelopmentState) {
  const exists = await checkExistence(development.fullPath);
  if (!exists) {
    return ["-"];
  }

  const statuses = [];

  const gitExists = await checkForGit(development.fullPath);
  if (gitExists) {
    await getGit().cwd(development.fullPath);
    const statusSummary = await getGit().status();

    statuses.push(
      statusSummary.behind > 0 || statusSummary.ahead > 0
        ? "sync-pending"
        : "synced",
    );

    if (statusSummary.files.length > 0) {
      statuses.push("edited");
    }
  } else {
    statuses.push("non-git");
  }

  if (development.convention != null) {
    const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
    const conventionPath = path.resolve(
      path.join(
        scriptDirectory,
        "..",
        "conventions",
        development.convention + ".js",
      ),
    );
    if (fs.existsSync(conventionPath)) {
      const { checkConventionAdherence } = await import(conventionPath);
      if (
        !(await checkConventionAdherence(
          development,
          path.dirname(conventionPath),
        ))
      ) {
        statuses.push("convention-broke");
      }
    }
  }

  return statuses;
}

async function dynamicOptions() {
  const options = [
    { name: "opt1", label: "Option 1" },
    { name: "opt2", label: "Option 2" },
    { name: "opt3", label: "Option 3" },
  ];
  const choice = await promptOptions("PLACEHOLDER OPTIONS:", options);
  console.log(`You chose: ${choice.label}`);
}

async function showAllProjects() {
  const options = [{ name: "Back", action: showDevelopmentsMenu }];

  const state = getState();

  for (const development of state.developments) {
    options.push({
      name: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
      action: dynamicOptions,
    });
  }

  await promptMenu("Select a project:", options);
  showAllProjects();
}

async function showNotHavingAncaJson() {
  const options = [{ name: "Back", action: showDevelopmentsMenu }];

  const state = getState();

  for (const development of state.developments) {
    if (
      (await checkExistence(development.fullPath)) &&
      !(await checkExistence(path.join(development.fullPath, "anca.json")))
    ) {
      options.push({
        name: getDevelopmentDisplayName(development),
        action: dynamicOptions,
      });
    }
  }

  await promptMenu("Select to create anca.json:", options);
  showNotHavingAncaJson();
}

async function showPresentedLocally() {
  const options = [{ name: "Back", action: showDevelopmentsMenu }];

  const state = getState();

  for (const development of state.developments) {
    if (await checkExistence(development.fullPath)) {
      options.push({
        name: `${getDevelopmentDisplayName(development)} (${(await getDevelopmentStatus(development)).join(", ")})`,
        action: dynamicOptions,
      });
    }
  }

  await promptMenu("Select:", options);
  showPresentedLocally();
}

async function showNotPresentedLocally() {
  const options = [{ name: "Back", action: showDevelopmentsMenu }];

  const state = getState();

  for (const development of state.developments) {
    if (!(await checkExistence(development.fullPath))) {
      options.push({
        name: getDevelopmentDisplayName(development),
        action: async () => {
          await syncDevelopment(development, false, false, true);
        },
      });
    }
  }

  await promptMenu("Select to clone:", options);
  showNotPresentedLocally();
}

async function showDevelopmentsMenu() {
  await promptMenu("Developments Menu", [
    { name: "Back", action: showMainMenu },
    { name: "List of issues", action: dynamicOptions },
    { name: "List of not having anca.json", action: showNotHavingAncaJson },
    { name: "List of presented locally", action: showPresentedLocally },
    { name: "List of not presented locally", action: showNotPresentedLocally },
    { name: "List of all projects", action: showAllProjects },
  ]);
}

export async function showMainMenu() {
  await promptMenu("Main Menu", [
    {
      name: "Quit",
      action: async () => {
        console.log("Bye.");
      },
    },
    {
      name: "Deployments",
      action: async () => {
        console.log("Deployments selected");
        showMainMenu();
      },
    },
    { name: "Developments", action: showDevelopmentsMenu },
  ]);
}
