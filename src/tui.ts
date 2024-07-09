import { promptMenu } from "clivo";
import pc from "picocolors";

import { fixAncaConfig } from "./actions/anca.js";
import {
  fixDevcontainerDockerfile,
  fixDevcontainerJson,
} from "./actions/devcontainers.js";
import { fixGitIgnore } from "./actions/git.js";
import {
  fixGithubActionsOtherFiles,
  fixGithubActionsRelease,
  fixGithubActionsTest,
} from "./actions/github-actions.js";
import { fixLicenseMd } from "./actions/license.js";
import {
  checkNodejsPackageJsonDevDependencies,
  fixNodejsPackageJson,
  writeNodejsPackageJson,
} from "./actions/nodejs.js";
import { fixNodejsEslintConfigJs } from "./actions/nodejs-eslint.js";
import {
  fixNodejsPrettierIgnore,
  fixNodejsPrettierRc,
} from "./actions/nodejs-prettier.js";
import { fixReadmeMd } from "./actions/readme.js";
import cinnabarData from "./cinnabar.js";
import { getInstance } from "./config.js";
import {
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
    ancaJsonFix: {
      action: async () => {
        await fixAncaConfig(development);
        await backHere();
      },
      label: "[anca.json] Fix",
    },
    devcontainerDockerfileSetToDefault: {
      action: async () => {
        await fixDevcontainerDockerfile(development);
        await backHere();
      },
      label: "[.devcontainer/Dockerfile] Set to default",
    },
    devcontainerJsonSetToDefault: {
      action: async () => {
        await fixDevcontainerJson(development);
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
    gitIgnoreSetToDefault: {
      action: async () => {
        await fixGitIgnore(development);
        await backHere();
      },
      label: "[.gitignore] Set to default",
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
        await fixGithubActionsRelease(development);
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
    licenseSetToDefault: {
      action: async () => {
        await fixLicenseMd(development);
        await backHere();
      },
      label: "[LICENSE] Set to default",
    },
    nodejsEslintSetToDefault: {
      action: async () => {
        await fixNodejsEslintConfigJs(development);
        await backHere();
      },
      label: "[eslint.config.js] Set to default",
    },
    nodejsPackageJsonCheckUpdates: {
      action: async () => {
        await checkNodejsPackageJsonDevDependencies(development);
        await writeNodejsPackageJson(development);
        await backHere();
      },
      label: "[package.json] Check dependencies updates",
    },
    nodejsPackageJsonFix: {
      action: async () => {
        await fixNodejsPackageJson(development);
        await writeNodejsPackageJson(development);
        await backHere();
      },
      label: "[package.json] Fix",
    },
    nodejsPrettierIgnoreSetToDefault: {
      action: async () => {
        await fixNodejsPrettierIgnore(development);
        await backHere();
      },
      label: "[.prettierignore] Set to default",
    },
    nodejsPrettierRcSetToDefault: {
      action: async () => {
        await fixNodejsPrettierRc(development);
        await backHere();
      },
      label: "[.prettierrc] Set to default",
    },
    readmeSetToDefault: {
      action: async () => {
        await fixReadmeMd(development);
        await backHere();
      },
      label: "[README.md] Set to default",
    },
  };

  const map = (code: string, isIssue: boolean) => {
    const mapping = mappings[code];
    if (mapping) {
      menu.push({
        action: mapping.action,
        label: isIssue ? pc.bgRed("[!]") + " " + mapping.label : mapping.label,
      });
    } else {
      menu.push({
        action: async () => {
          await backHere();
        },
        label: "THE ACTION IS NOT IMPLEMENTED: " + code,
      });
    }
  };

  state.issues.forEach((code) => map(code, true));
  state.actions.forEach((code) => map(code, false));

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
async function showProblematicLocalDevelopments() {
  const options = [{ action: showDevelopmentsMenu, label: "Back" }];

  const state = getInstance();

  for (const development of state.developments) {
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
  await promptMenu(`\n[${APP_NAME_AND_VERSION}]`, [
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
