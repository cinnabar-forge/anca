import path from "path";
import pc from "picocolors";

import { checkAnca } from "./actions/anca.js";
import {
  checkDevcontainerDockerfile,
  checkDevcontainerJson,
} from "./actions/devcontainers.js";
import {
  checkGithubActionsOtherFiles,
  checkGithubActionsRelease,
  checkGithubActionsTest,
} from "./actions/github-actions.js";
import { NodejsPackageJson, checkNodejsPackageJson } from "./actions/nodejs.js";
import { checkForGit, getGit } from "./git.js";
import { AncaConfig, AncaDevelopment, AncaDevelopmentState } from "./schema.js";
import {
  checkExistence,
  readFolderFile,
  readFolderJsonFile,
  writeFolderFile,
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

  if (config == null) {
    state.actions.push("ancaJsonCreate");
    return;
  } else if (!checkAnca(state.config)) {
    state.issues.push("ancaJsonFix");
    return;
  }

  await addCommonToDevelopmentPack(development, state);

  await addDevcontainersToDevelopmentPack(development, state);

  await addGithubActionsToDevelopmentPack(development, state);

  if (state.config.stack === "nodejs") {
    await addNodeJsToDevelopmentPack(development, state);
  }
}

/**
 *
 * @param development
 * @param state
 * @param file
 */
async function addFileToPack(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
  file: string,
) {
  const contents = await readFolderFile(development.fullPath, file);
  if (contents != null) {
    state.files[file] = contents;
  }
  return contents;
}

/**
 *
 * @param development
 * @param state
 * @param file
 */
async function addJsonFileToPack(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
  file: string,
) {
  const contents = await readFolderJsonFile(development.fullPath, file);
  if (contents != null) {
    state.jsonFiles[file] = contents;
  }
  return contents;
}

/**
 *
 * @param development
 * @param state
 */
async function addCommonToDevelopmentPack(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
) {
  const gitIgnoreContent = await addFileToPack(
    development,
    state,
    ".gitignore",
  );
  const licenseContent = await addFileToPack(development, state, "LICENSE");
  const readmeContent = await addFileToPack(development, state, "README.md");

  if (gitIgnoreContent == null) {
    state.issues.push("gitIgnoreCreate");
  }

  if (licenseContent == null) {
    state.issues.push("licenseCreate");
  }

  if (readmeContent == null) {
    state.issues.push("readmeCreate");
  }
}

/**
 *
 * @param development
 * @param state
 */
async function addDevcontainersToDevelopmentPack(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
) {
  const devcontainerJsonContent = await addJsonFileToPack(
    development,
    state,
    ".devcontainer/devcontainer.json",
  );
  const dockerfileContent = await addFileToPack(
    development,
    state,
    ".devcontainer/Dockerfile",
  );

  if (
    devcontainerJsonContent == null ||
    !checkDevcontainerJson(state, devcontainerJsonContent)
  ) {
    state.issues.push("devcontainerJsonSetToDefault");
  }

  if (
    dockerfileContent == null ||
    !checkDevcontainerDockerfile(state, dockerfileContent)
  ) {
    state.issues.push("devcontainerDockerfileSetToDefault");
  }
}

/**
 *
 * @param development
 * @param state
 */
async function addGithubActionsToDevelopmentPack(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
) {
  if (state.config.stack !== "nodejs") {
    return;
  }
  const releaseContent = await addFileToPack(
    development,
    state,
    ".github/workflows/release.yml",
  );
  const testContent = await addFileToPack(
    development,
    state,
    ".github/workflows/test.yml",
  );

  if (
    releaseContent == null ||
    !checkGithubActionsRelease(state, releaseContent)
  ) {
    state.issues.push("githubActionsReleaseSetToDefault");
  }

  if (testContent == null || !checkGithubActionsTest(testContent)) {
    state.issues.push("githubActionsTestSetToDefault");
  }

  if (!(await checkGithubActionsOtherFiles(development))) {
    state.actions.push("githubActionsOtherFilesRemove");
  }
}

/**
 *
 * @param development
 * @param state
 */
async function addNodeJsToDevelopmentPack(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
) {
  const packageJsonContent: NodejsPackageJson | null = await addJsonFileToPack(
    development,
    state,
    "package.json",
  );
  const eslintContent = await addFileToPack(
    development,
    state,
    "eslint.config.js",
  );
  const prettierRcContent = await addFileToPack(
    development,
    state,
    ".prettierrc",
  );
  const prettierIgnoreContent = await addFileToPack(
    development,
    state,
    ".prettierignore",
  );

  if (
    packageJsonContent == null ||
    !checkNodejsPackageJson(state, packageJsonContent)
  ) {
    state.issues.push("nodejsPackageJsonFix");
  }
  state.actions.push("nodejsPackageJsonCheckUpdates");

  if (eslintContent == null) {
    state.issues.push("nodejsEslintCreate");
  }

  if (prettierRcContent == null) {
    state.issues.push("nodejsPrettierRcCreate");
  }

  if (prettierIgnoreContent == null) {
    state.issues.push("nodejsPrettierIgnoreCreate");
  }
}

/**
 * Creates anca.json file
 * @param development
 * @param config
 */
export async function createAncaJson(
  development: AncaDevelopment,
  config: AncaConfig,
) {
  await writeFolderFile(
    development.fullPath,
    "anca.json",
    JSON.stringify(config),
  );
}
