import path from "path";
import pc from "picocolors";

import { checkForGit, getGit } from "./git.js";
import {
  AncaConfig,
  AncaConfigStack,
  AncaConfigType,
  AncaDevelopmentActions,
  AncaDevelopmentState,
} from "./schema.js";
import {
  checkExistence,
  readFolderFile,
  readFolderJson,
  writeFolderFile,
} from "./utils.js";

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
        ? pc.bgYellow("sync-pending")
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
export async function getDevelopmentActions(
  development: AncaDevelopmentState,
): Promise<AncaDevelopmentActions> {
  const exists = await checkExistence(development.fullPath);

  const actions: AncaDevelopmentActions = {};

  if (!exists) {
    actions.gitClone = true;
    return actions;
  }

  const ancaJsonContent = await readFolderJson(
    development.fullPath,
    "anca.json",
  );

  if (ancaJsonContent == null) {
    actions.ancaJsonCreate = true;
    return actions;
  }

  const packageJsonContent = await readFolderJson(
    development.fullPath,
    "package.json",
  );

  const gitIgnoreContent = await readFolderFile(
    development.fullPath,
    ".gitignore",
  );

  const licenseContent = await readFolderFile(development.fullPath, "LICENSE");

  const readmeContent = await readFolderFile(development.fullPath, "README.md");

  const eslintContent = await readFolderFile(
    development.fullPath,
    "eslint.config.js",
  );

  const prettierRcContent = await readFolderFile(
    development.fullPath,
    ".prettierrc",
  );

  const prettierIgnoreContent = await readFolderFile(
    development.fullPath,
    ".prettierignore",
  );

  if (gitIgnoreContent == null) {
    actions.gitIgnoreCreate = true;
  }

  if (licenseContent == null) {
    actions.license = true;
  }

  if (readmeContent == null) {
    actions.readmeCreate = true;
  }

  if (packageJsonContent != null && packageJsonContent.keywords != null) {
    actions.packageJsonKeywords = true;
  }

  if (eslintContent == null) {
    actions.nodejsEslintCreate = true;
  }

  if (prettierRcContent == null) {
    actions.nodejsPrettierRcCreate = true;
  }

  if (prettierIgnoreContent == null) {
    actions.nodejsPrettierIgnoreCreate = true;
  }

  return actions;
}

/**
 * 
 * @param development
 * @param type
 * @param stack
 */
export async function createAncaJson(
  development: AncaDevelopmentState,
  type: AncaConfigType,
  stack: AncaConfigStack,
) {
  const ancaJsonContent: AncaConfig = {
    deployment: {
      preparation: [],
      start: [],
    },
    development: {
      cinnabarMeta: true,
      gitIgnore: "cinnabar",
      license: true,
      nodejs: "cinnabar",
      nodejsEslint: "cinnabar",
      nodejsPrettier: "cinnabar",
      readme: "cinnabar",
    },
    stack,
    type,
  };
  await writeFolderFile(
    development.fullPath,
    "anca.json",
    JSON.stringify(ancaJsonContent),
  );
}
