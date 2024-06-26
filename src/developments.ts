import path from "path";
import pc from "picocolors";

import { checkForGit, getGit } from "./git.js";
import {
  AncaConfig,
  AncaConfigStack,
  AncaConfigType,
  AncaDevelopmentState,
} from "./schema.js";
import {
  checkExistence,
  readFolderFile,
  readFolderJson,
  writeFolderFile,
} from "./utils.js";

const actionsCache: Map<string, string[]> = new Map<string, string[]>();

/**
 *
 */
export function clearDevelopmentsActionsCache() {
  actionsCache.clear();
}

/**
 *
 * @param development
 */
export function clearDevelopmentActionsCache(
  development: AncaDevelopmentState,
) {
  actionsCache.delete(development.fullPath);
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

  const actions = await getDevelopmentActions(development);

  if (
    actions != null &&
    actions[0] !== "gitClone" &&
    actions[0] !== "ancaJsonCreate"
  ) {
    statuses.push(pc.bgRed("issues: " + actions.length));
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
): Promise<string[]> {
  const cache = actionsCache.get(development.fullPath);
  if (cache != null) {
    return cache;
  }
  const exists = await checkExistence(development.fullPath);

  const actions: string[] = [];

  if (!exists) {
    actions.push("gitClone");
    actionsCache.set(development.fullPath, actions);
    return actions;
  }

  const ancaJsonContent = await readFolderJson(
    development.fullPath,
    "anca.json",
  );

  if (ancaJsonContent == null) {
    actions.push("ancaJsonCreate");
    actionsCache.set(development.fullPath, actions);
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
    actions.push("gitIgnoreCreate");
  }

  if (licenseContent == null) {
    actions.push("licenseCreate");
  }

  if (readmeContent == null) {
    actions.push("readmeCreate");
  }

  if (packageJsonContent != null && packageJsonContent.keywords != null) {
    actions.push("packageJsonKeywordsUpdate");
  }

  if (eslintContent == null) {
    actions.push("nodejsEslintCreate");
  }

  if (prettierRcContent == null) {
    actions.push("nodejsPrettierRcCreate");
  }

  if (prettierIgnoreContent == null) {
    actions.push("nodejsPrettierIgnoreCreate");
  }

  actionsCache.set(development.fullPath, actions);

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
