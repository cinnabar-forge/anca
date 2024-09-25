import { promptMenu } from "clivo";
import pc from "picocolors";

import { fixAncaConfig } from "./actions/anca.js";
import { fixContributingMd } from "./actions/contributing.js";
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
  fixNodejsPackageJson,
  getUpdatedPackagesCommitMessage,
  installNodejsDependencies,
  NodejsPackageJson,
  NpmUpdate,
  updateNodejsPackageJsonDependencies,
  updateNodejsPackageJsonDevDependencies,
  writeNodejsPackageJson,
} from "./actions/nodejs.js";
import { fixNodejsEsbuildJs } from "./actions/nodejs-esbuild.js";
import { fixNodejsEslintConfigJs } from "./actions/nodejs-eslint.js";
import { generateNodejsOpenapiFiles } from "./actions/nodejs-openapi.js";
import {
  fixNodejsPrettierIgnore,
  fixNodejsPrettierRc,
} from "./actions/nodejs-prettier.js";
import {
  fixNodejsSeaBuildJs,
  fixNodejsSeaConfigJson,
} from "./actions/nodejs-sea.js";
import { fixNodejsSrc, fixNodejsTest } from "./actions/nodejs-src.js";
import { fixNodejsTsconfigJson } from "./actions/nodejs-tsconfig.js";
import { fixNodejsTsupConfigJs } from "./actions/nodejs-tsup.js";
import { fixOpenapiJson } from "./actions/openapi.js";
import { fixReadmeMd } from "./actions/readme.js";
import { CINNABAR_PROJECT_VERSION } from "./cinnabar.js";
import { getInstance } from "./config.js";
import {
  getDevelopmentDisplayName,
  getDevelopmentStatus,
  refreshDevelopmentState,
  syncDevelopment,
} from "./developments.js";
import { AncaAction, AncaDevelopment } from "./schema.js";
import { checkExistence } from "./utils.js";

interface ClivoAction {
  action: () => Promise<void>;
  label: string;
}

const APP_NAME_AND_VERSION = `ANCA v${CINNABAR_PROJECT_VERSION}`;

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

  const mappings: Record<AncaAction, ClivoAction> = {
    ancaJsonFix: {
      action: async () => {
        await fixAncaConfig(development);
        await backHere();
      },
      label: "[anca.json] Fix",
    },
    contributingSetToDefault: {
      action: async () => {
        await fixContributingMd(development);
        await backHere();
      },
      label: "[CONTRIBUTING.md] Set to default",
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
    gitIgnoreSetToDefault: {
      action: async () => {
        await fixGitIgnore(development);
        await backHere();
      },
      label: "[.gitignore] Set to default",
    },
    licenseSetToDefault: {
      action: async () => {
        await fixLicenseMd(development);
        await backHere();
      },
      label: "[LICENSE] Set to default",
    },
    nodejsEsbuildSetToDefault: {
      action: async () => {
        await fixNodejsEsbuildJs(development);
        await backHere();
      },
      label: "[esbuild.js] Set to default",
    },
    nodejsEslintSetToDefault: {
      action: async () => {
        await fixNodejsEslintConfigJs(development);
        await backHere();
      },
      label: "[eslint.config.js] Set to default",
    },
    nodejsOpenapiSetToDefault: {
      action: async () => {
        await generateNodejsOpenapiFiles(development);
        await backHere();
      },
      label: "[openapi] Set to default",
    },
    nodejsPackageJsonCheckUpdates: {
      action: async () => {
        const fileContents = development.state?.jsonFiles[
          "package.json"
        ] as NodejsPackageJson;
        if (fileContents != null) {
          const rebuildFile: NodejsPackageJson = {};
          const npmUpdate: NpmUpdate =
            await updateNodejsPackageJsonDependencies(
              rebuildFile,
              development,
              false,
              true,
            );
          npmUpdate.push(
            ...(await updateNodejsPackageJsonDevDependencies(
              rebuildFile,
              development,
              false,
              true,
            )),
          );
          console.log("\nAdd to commit message: \n");
          console.log(getUpdatedPackagesCommitMessage(npmUpdate));
          console.log();
          fileContents.dependencies = rebuildFile.dependencies;
          fileContents.devDependencies = rebuildFile.devDependencies;
          await writeNodejsPackageJson(development);
          await installNodejsDependencies(development);
        }
        await backHere();
      },
      label: "[package.json] Check dependencies updates",
    },
    nodejsPackageJsonFix: {
      action: async () => {
        await fixNodejsPackageJson(development, false);
        await writeNodejsPackageJson(development);
        await installNodejsDependencies(development);
        await backHere();
      },
      label: "[package.json] Fix",
    },
    nodejsPackageJsonFixFull: {
      action: async () => {
        await fixNodejsPackageJson(development, true);
        await writeNodejsPackageJson(development);
        await installNodejsDependencies(development);
        await backHere();
      },
      label: "[package.json] Fix & add optional fields",
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
    nodejsSeaBuildJsSetToDefault: {
      action: async () => {
        await fixNodejsSeaBuildJs(development);
        await backHere();
      },
      label: "[sea.build.js] Set to default",
    },
    nodejsSeaConfigJsonSetToDefault: {
      action: async () => {
        await fixNodejsSeaConfigJson(development);
        await backHere();
      },
      label: "[sea.config.json] Set to default",
    },
    nodejsSrcSetToDefault: {
      action: async () => {
        await fixNodejsSrc(development);
        await backHere();
      },
      label: "[src/index.ts] Set to default",
    },
    nodejsTestSetToDefault: {
      action: async () => {
        await fixNodejsTest(development);
        await backHere();
      },
      label: "[test/index.test.ts] Set to default",
    },
    nodejsTsconfigSetToDefault: {
      action: async () => {
        await fixNodejsTsconfigJson(development);
        await backHere();
      },
      label: "[tsconfig.json] Set to default",
    },
    nodejsTsupConfigJsSetToDefault: {
      action: async () => {
        await fixNodejsTsupConfigJs(development);
        await backHere();
      },
      label: "[tsup.config.js] Set to default",
    },
    openapiJsonSetToDefault: {
      action: async () => {
        await fixOpenapiJson(development);
        await backHere();
      },
      label: "[openapi.json] Set to default",
    },
    readmeSetToDefault: {
      action: async () => {
        await fixReadmeMd(development);
        await backHere();
      },
      label: "[README.md] Set to default",
    },
  };

  const map = (code: AncaAction, isIssue: boolean) => {
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
