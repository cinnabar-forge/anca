import fs from "fs";
import path from "path";
import pc from "picocolors";

import { checkAnca } from "./actions/anca.js";
import {
  checkDevcontainerDockerfile,
  checkDevcontainerJson,
} from "./actions/devcontainers.js";
import { checkGitIgnore } from "./actions/git.js";
import {
  checkGithubActionsOtherFiles,
  checkGithubActionsRelease,
  checkGithubActionsTest,
} from "./actions/github-actions.js";
import { checkLicenseMd } from "./actions/license.js";
import { checkNodejsPackageJson } from "./actions/nodejs.js";
import { checkNodejsEslintConfigJs } from "./actions/nodejs-eslint.js";
import {
  checkNodejsPrettierIgnore,
  checkNodejsPrettierRc,
} from "./actions/nodejs-prettier.js";
import { checkReadmeMd } from "./actions/readme.js";
import { checkForGit, getGit } from "./git.js";
import { AncaDevelopment, AncaDevelopmentState } from "./schema.js";
import {
  checkExistence,
  readFolderFile,
  readFolderJsonFile,
  writeFolderJsonFile,
} from "./utils.js";

/**
 *
 * @param development
 */
export async function getDevelopmentStatus(development: AncaDevelopment) {
  const exists = await checkExistence(development.fullPath);
  if (!exists) {
    return ["remote"];
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
        ? pc.bgYellow("sync pending")
        : pc.bgGreen("synced"),
    );

    if (statusSummary.files.length > 0) {
      statuses.push(pc.bgMagenta("edited"));
    }
  } else {
    statuses.push(pc.bgWhite("non-git"));
  }

  if (!hasAncaJson) {
    statuses.push(pc.bgCyan("non-anca"));
  }

  await refreshDevelopmentState(development);

  if (
    development.state != null &&
    development.state.issues != null &&
    development.state.issues.length > 0
  ) {
    statuses.push(pc.bgRed("issues: " + development.state.issues.length));
  }

  if (development.state != null && development.state.config != null) {
    statuses.unshift(
      `${development.state.config.stack || "unsupported"} ${development.state.config.type || "project"}`,
    );
  }

  return statuses;
}

/**
 * Performs specified git operations on the repo
 * @param {AncaDevelopment} development
 */
export async function syncDevelopment(development: AncaDevelopment) {
  if (development.data.gitOrigin == null) {
    return;
  }
  const folderExists = await checkExistence(development.fullPath);
  const gitExists = await checkForGit(development.fullPath);
  if (folderExists && gitExists) {
    await getGit().cwd(development.fullPath).fetch();
  } else if (folderExists) {
    await getGit().cwd(development.fullPath).init();
  } else {
    await getGit().clone(development.data.gitOrigin, development.fullPath);
  }
}

/**
 * Gets development display name
 * @param development
 */
export function getDevelopmentDisplayName(
  development: AncaDevelopment,
): string {
  return `${development.data.name}${pc.dim("@" + development.data.folder)}`;
}

/**
 * Gets development actions
 * @param development
 */
export async function refreshDevelopmentState(
  development: AncaDevelopment,
): Promise<void> {
  if (development.state != null) {
    return;
  }
  const exists = await checkExistence(development.fullPath);

  const config = await readFolderJsonFile(development.fullPath, "anca.json");

  const state: AncaDevelopmentState = {
    actions: [],
    config: config || {},
    files: {},
    issues: [],
    jsonFiles: {},
  };
  development.state = state;

  if (!exists) {
    state.actions.push("gitClone");
    return;
  }

  if (!(await checkAnca(development))) {
    if (config == null) {
      state.actions.push("ancaJsonFix");
    } else {
      state.issues.push("ancaJsonFix");
    }
    return;
  }

  await addCommonToDevelopmentPack(development);

  await addDevcontainersToDevelopmentPack(development);

  await addGithubActionsToDevelopmentPack(development);

  if (state.config.stack === "nodejs") {
    await addNodeJsToDevelopmentPack(development);
  }

  const folder = path.join(".", "data", "tmp", development.data.folder);
  fs.mkdirSync(folder, { recursive: true });
  await writeFolderJsonFile(
    folder,
    development.data.name + ".json",
    development,
  );
}

/**
 *
 * @param development
 * @param file
 */
async function addFileToPack(development: AncaDevelopment, file: string) {
  if (development.state == null) {
    return;
  }
  development.state.files[file] =
    (await readFolderFile(development.fullPath, file)) || "";
}

/**
 *
 * @param development
 * @param file
 */
async function addJsonFileToPack(development: AncaDevelopment, file: string) {
  if (development.state == null) {
    return;
  }
  development.state.jsonFiles[file] =
    (await readFolderJsonFile(development.fullPath, file)) || {};
}

/**
 *
 * @param development
 */
async function addCommonToDevelopmentPack(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }

  await addFileToPack(development, ".gitignore");
  await addFileToPack(development, "LICENSE");
  await addFileToPack(development, "README.md");

  if (!(await checkGitIgnore(development))) {
    development.state.issues.push("gitIgnoreSetToDefault");
  }

  if (!(await checkLicenseMd(development))) {
    development.state.issues.push("licenseSetToDefault");
  }

  if (!(await checkReadmeMd(development))) {
    development.state.issues.push("readmeSetToDefault");
  }
}

/**
 *
 * @param development
 */
async function addDevcontainersToDevelopmentPack(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }

  await addJsonFileToPack(development, ".devcontainer/devcontainer.json");
  await addFileToPack(development, ".devcontainer/Dockerfile");

  if (!(await checkDevcontainerJson(development))) {
    development.state.issues.push("devcontainerJsonSetToDefault");
  }

  if (!(await checkDevcontainerDockerfile(development))) {
    development.state.issues.push("devcontainerDockerfileSetToDefault");
  }
}

/**
 *
 * @param development
 */
async function addGithubActionsToDevelopmentPack(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  if (development.state.config.stack !== "nodejs") {
    return;
  }

  await addFileToPack(development, ".github/workflows/release.yml");
  await addFileToPack(development, ".github/workflows/test.yml");

  if (!(await checkGithubActionsRelease(development))) {
    development.state.issues.push("githubActionsReleaseSetToDefault");
  }

  if (!(await checkGithubActionsTest(development))) {
    development.state.issues.push("githubActionsTestSetToDefault");
  }

  if (!(await checkGithubActionsOtherFiles(development))) {
    development.state.actions.push("githubActionsOtherFilesRemove");
  }
}

/**
 *
 * @param development
 */
async function addNodeJsToDevelopmentPack(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }

  await addJsonFileToPack(development, "package.json");
  await addFileToPack(development, "eslint.config.js");
  await addFileToPack(development, ".prettierrc");
  await addFileToPack(development, ".prettierignore");

  if (!(await checkNodejsPackageJson(development))) {
    development.state.issues.push("nodejsPackageJsonFix");
  }
  development.state.actions.push("nodejsPackageJsonCheckUpdates");

  if (!(await checkNodejsEslintConfigJs(development))) {
    development.state.issues.push("nodejsEslintSetToDefault");
  }

  if (!(await checkNodejsPrettierRc(development))) {
    development.state.issues.push("nodejsPrettierRcSetToDefault");
  }

  if (!(await checkNodejsPrettierIgnore(development))) {
    development.state.issues.push("nodejsPrettierIgnoreSetToDefault");
  }
}
