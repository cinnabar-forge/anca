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
import { checkForGit, getGit } from "./git.js";
import {
  AncaConfig,
  AncaDevelopmentPack,
  AncaDevelopmentState,
} from "./schema.js";
import {
  checkExistence,
  readFolderFile,
  readFolderJsonFile,
  writeFolderFile,
} from "./utils.js";

interface PackageJson {
  keywords?: string[];
}

const developmentCache: Map<string, AncaDevelopmentPack> = new Map<
  string,
  AncaDevelopmentPack
>();

/**
 *
 */
export function clearDevelopmentsDevelopmentCache() {
  developmentCache.clear();
}

/**
 *
 * @param development
 */
export function clearDevelopmentDevelopmentCache(
  development: AncaDevelopmentState,
) {
  developmentCache.delete(development.fullPath);
}

/**
 *
 * @param development
 */
export async function getDevelopmentStatus(development: AncaDevelopmentState) {
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

  const pack = await getDevelopmentPack(development);

  if (pack != null && pack.issues != null && pack.issues.length > 0) {
    statuses.push(pc.bgRed("issues: " + pack.issues.length));
  }

  if (pack.config != null) {
    statuses.unshift(
      `${pack.config.stack || "unsupported"} ${pack.config.type || "project"}`,
    );
  }

  return statuses;
}

/**
 * Performs specified git operations on the repo
 * @param {AncaDevelopmentState} development
 */
export async function syncDevelopment(development: AncaDevelopmentState) {
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
  development: AncaDevelopmentState,
): string {
  return `${development.data.name}${pc.dim("@" + development.data.folder)}`;
}

/**
 * Gets development actions
 * @param development
 */
export async function getDevelopmentPack(
  development: AncaDevelopmentState,
): Promise<AncaDevelopmentPack> {
  const cache = developmentCache.get(development.fullPath);
  if (cache != null) {
    return cache;
  }
  const exists = await checkExistence(development.fullPath);

  const pack: AncaDevelopmentPack = {
    actions: [],
    config: (await readFolderJsonFile(development.fullPath, "anca.json")) || {},
    files: {},
    issues: [],
    jsonFiles: {},
  };

  developmentCache.set(development.fullPath, pack);

  if (!exists) {
    pack.actions.push("gitClone");
    return pack;
  }

  if (pack.config == null) {
    pack.actions.push("ancaJsonCreate");
    return pack;
  } else if (!checkAnca(pack.config)) {
    pack.issues.push("ancaJsonFix");
    return pack;
  }

  await addCommonToDevelopmentPack(development, pack);

  await addDevcontainersToDevelopmentPack(development, pack);

  await addGithubActionsToDevelopmentPack(development, pack);

  if (pack.config.stack === "nodejs") {
    await addNodeJsToDevelopmentPack(development, pack);
  }

  return pack;
}

/**
 *
 * @param development
 * @param pack
 * @param file
 */
async function addFileToPack(
  development: AncaDevelopmentState,
  pack: AncaDevelopmentPack,
  file: string,
) {
  const contents = await readFolderFile(development.fullPath, file);
  if (contents != null) {
    pack.files[file] = contents;
  }
  return contents;
}

/**
 *
 * @param development
 * @param pack
 * @param file
 */
async function addJsonFileToPack(
  development: AncaDevelopmentState,
  pack: AncaDevelopmentPack,
  file: string,
) {
  const contents = await readFolderJsonFile(development.fullPath, file);
  if (contents != null) {
    pack.jsonFiles[file] = contents;
  }
  return contents;
}

/**
 *
 * @param development
 * @param pack
 */
async function addCommonToDevelopmentPack(
  development: AncaDevelopmentState,
  pack: AncaDevelopmentPack,
) {
  const gitIgnoreContent = await addFileToPack(development, pack, ".gitignore");
  const licenseContent = await addFileToPack(development, pack, "LICENSE");
  const readmeContent = await addFileToPack(development, pack, "README.md");

  if (gitIgnoreContent == null) {
    pack.issues.push("gitIgnoreCreate");
  }

  if (licenseContent == null) {
    pack.issues.push("licenseCreate");
  }

  if (readmeContent == null) {
    pack.issues.push("readmeCreate");
  }
}

/**
 *
 * @param development
 * @param pack
 */
async function addDevcontainersToDevelopmentPack(
  development: AncaDevelopmentState,
  pack: AncaDevelopmentPack,
) {
  const devcontainerJsonContent = await addJsonFileToPack(
    development,
    pack,
    ".devcontainer/devcontainer.json",
  );
  const dockerfileContent = await addFileToPack(
    development,
    pack,
    ".devcontainer/Dockerfile",
  );

  if (
    devcontainerJsonContent == null ||
    !checkDevcontainerJson(pack, devcontainerJsonContent)
  ) {
    pack.issues.push("devcontainerJsonSetToDefault");
  }

  if (
    dockerfileContent == null ||
    !checkDevcontainerDockerfile(pack, dockerfileContent)
  ) {
    pack.issues.push("devcontainerDockerfileSetToDefault");
  }
}

/**
 *
 * @param development
 * @param pack
 */
async function addGithubActionsToDevelopmentPack(
  development: AncaDevelopmentState,
  pack: AncaDevelopmentPack,
) {
  if (pack.config.stack !== "nodejs") {
    return;
  }
  const releaseContent = await addFileToPack(
    development,
    pack,
    ".github/workflows/release.yml",
  );
  const testContent = await addFileToPack(
    development,
    pack,
    ".github/workflows/test.yml",
  );

  if (releaseContent == null || !checkGithubActionsRelease(releaseContent)) {
    pack.issues.push("githubActionsReleaseSetToDefault");
  }

  if (testContent == null || !checkGithubActionsTest(testContent)) {
    pack.issues.push("githubActionsTestSetToDefault");
  }

  if (!(await checkGithubActionsOtherFiles(development))) {
    pack.issues.push("githubActionsOtherFilesRemove");
  }
}

/**
 *
 * @param development
 * @param pack
 */
async function addNodeJsToDevelopmentPack(
  development: AncaDevelopmentState,
  pack: AncaDevelopmentPack,
) {
  const packageJsonContent: PackageJson | null = await addJsonFileToPack(
    development,
    pack,
    "package.json",
  );
  const eslintContent = await addFileToPack(
    development,
    pack,
    "eslint.config.js",
  );
  const prettierRcContent = await addFileToPack(
    development,
    pack,
    ".prettierrc",
  );
  const prettierIgnoreContent = await addFileToPack(
    development,
    pack,
    ".prettierignore",
  );

  if (packageJsonContent != null && packageJsonContent.keywords != null) {
    pack.issues.push("packageJsonKeywordsUpdate");
  }

  if (eslintContent == null) {
    pack.issues.push("nodejsEslintCreate");
  }

  if (prettierRcContent == null) {
    pack.issues.push("nodejsPrettierRcCreate");
  }

  if (prettierIgnoreContent == null) {
    pack.issues.push("nodejsPrettierIgnoreCreate");
  }
}

/**
 * Creates anca.json file
 * @param development
 * @param config
 */
export async function createAncaJson(
  development: AncaDevelopmentState,
  config: AncaConfig,
) {
  await writeFolderFile(
    development.fullPath,
    "anca.json",
    JSON.stringify(config),
  );
}
