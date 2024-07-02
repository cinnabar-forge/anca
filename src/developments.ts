import path from "path";
import pc from "picocolors";

import { checkAnca } from "./actions/anca.js";
import { checkForGit, getGit } from "./git.js";
import { AncaConfig, AncaDevelopmentState } from "./schema.js";
import {
  checkExistence,
  readFolderFile,
  readFolderJson,
  writeFolderFile,
} from "./utils.js";

export interface DevelopmentPack {
  actions: string[];
  files: Record<string, string>;
  issues: string[];
  jsons: Record<string, object>;
}

const developmentCache: Map<string, DevelopmentPack> = new Map<
  string,
  DevelopmentPack
>();
const projectTypeCache: Map<string, { stack: string; type: string }> = new Map<
  string,
  { stack: string; type: string }
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

  const ancaType = projectTypeCache.get(development.fullPath);

  if (ancaType != null) {
    statuses.unshift(`${ancaType.stack} ${ancaType.type}`);
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
): Promise<DevelopmentPack> {
  const cache = developmentCache.get(development.fullPath);
  if (cache != null) {
    return cache;
  }
  const exists = await checkExistence(development.fullPath);

  const actions: string[] = [];
  const files: Record<string, string> = {};
  const issues: string[] = [];
  const jsons: Record<string, object> = {};

  const pack: DevelopmentPack = {
    actions,
    files,
    issues,
    jsons,
  };

  developmentCache.set(development.fullPath, pack);

  if (!exists) {
    actions.push("gitClone");
    return pack;
  }

  const ancaJsonContent = await readFolderJson(
    development.fullPath,
    "anca.json",
  );
  jsons["anca.json"] = ancaJsonContent;

  if (ancaJsonContent == null) {
    actions.push("ancaJsonCreate");
    return pack;
  } else if (!checkAnca(ancaJsonContent)) {
    issues.push("ancaJsonFix");
    return pack;
  } else {
    projectTypeCache.set(development.fullPath, {
      stack: ancaJsonContent.stack,
      type: ancaJsonContent.type,
    });
  }

  const packageJsonContent = await readFolderJson(
    development.fullPath,
    "package.json",
  );
  jsons["package.json"] = packageJsonContent;

  const gitIgnoreContent = await readFolderFile(
    development.fullPath,
    ".gitignore",
  );
  files[".gitignore"] = gitIgnoreContent;

  const licenseContent = await readFolderFile(development.fullPath, "LICENSE");
  files["LICENSE"] = licenseContent;

  const readmeContent = await readFolderFile(development.fullPath, "README.md");
  files["README.md"] = readmeContent;

  const eslintContent = await readFolderFile(
    development.fullPath,
    "eslint.config.js",
  );
  files["eslint.config.js"] = eslintContent;

  const prettierRcContent = await readFolderFile(
    development.fullPath,
    ".prettierrc",
  );
  files[".prettierrc"] = prettierRcContent;

  const prettierIgnoreContent = await readFolderFile(
    development.fullPath,
    ".prettierignore",
  );
  files[".prettierignore"] = prettierIgnoreContent;

  if (gitIgnoreContent == null) {
    issues.push("gitIgnoreCreate");
  }

  if (licenseContent == null) {
    issues.push("licenseCreate");
  }

  if (readmeContent == null) {
    issues.push("readmeCreate");
  }

  if (packageJsonContent != null && packageJsonContent.keywords != null) {
    issues.push("packageJsonKeywordsUpdate");
  }

  if (eslintContent == null) {
    issues.push("nodejsEslintCreate");
  }

  if (prettierRcContent == null) {
    issues.push("nodejsPrettierRcCreate");
  }

  if (prettierIgnoreContent == null) {
    issues.push("nodejsPrettierIgnoreCreate");
  }

  return pack;
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
