import { CftmBuilder } from "cftm";
import fs from "fs";
import path from "path";

/**
 *
 * @param filePath
 */
export async function checkExistence(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 *
 * @param directoryPath
 */
export async function checkForGit(directoryPath) {
  try {
    await fs.promises.access(path.resolve(directoryPath, ".git"));
    return true;
  } catch {
    return false;
  }
}

/**
 *
 * @param directoryPath
 */
async function getPackageJson(directoryPath) {
  const filePath = path.resolve(directoryPath, "package.json");
  return await fs.promises
    .access(filePath)
    .then(() => {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    })
    .catch(() => {
      return null;
    });
}

/**
 *
 * @param directoryPath
 */
async function getCinnabarJson(directoryPath) {
  const filePath = path.resolve(directoryPath, "cinnabar.json");
  return await fs.promises
    .access(filePath)
    .then(() => {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    })
    .catch(() => {
      return null;
    });
}

/**
 *
 * @param directoryPath
 */
async function getVersionJson(directoryPath) {
  const filePath = path.resolve(directoryPath, "version.json");
  return await fs.promises
    .access(filePath)
    .then(() => {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    })
    .catch(() => {
      return null;
    });
}

/**
 *
 * @param development
 * @param directoryPath
 */
export async function getDirectoryVersion(development, directoryPath) {
  let prefix = "";
  const cinnabarJson = await getCinnabarJson(directoryPath);
  development.cinnabarJson = cinnabarJson;

  let version;

  if (cinnabarJson != null) {
    version = `v${cinnabarJson.version.text}`;
  }

  const versionJson = await getVersionJson(directoryPath);
  development.versionJson = versionJson;

  if (version == null && versionJson != null) {
    version = `v${versionJson.major}.${versionJson.minor}.${versionJson.patch}`;
    prefix = " (cf-v)";
  }

  const packageJson = await getPackageJson(directoryPath);
  development.packageJson = packageJson;

  if (version == null && packageJson != null) {
    version = `v${packageJson.version}`;
    prefix = " (npm)";
  }

  if (version == null) {
    version = "-";
    prefix = "";
  }

  return version + prefix;
}

/**
 *
 * @param development
 * @param requestIssues
 */
export async function checkForConvention(development, requestIssues = false) {
  if (development.convention == null) {
    return !requestIssues ? true : [];
  }
  // const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
  // const conventionPath = path.resolve(
  //   path.join(
  //     scriptDirectory,
  //     "..",
  //     "conventions",
  //     development.convention + ".js",
  //   ),
  // );
  // if (fs.existsSync(conventionPath)) {
  //   // eslint-disable-next-line node/no-unsupported-features/es-syntax
  //   const { checkConventionAdherence } = await import(conventionPath);
  //   return await checkConventionAdherence(
  //     development,
  //     path.dirname(conventionPath),
  //     requestIssues,
  //   );
  // }
  return !requestIssues ? true : [];
}

/**
 *
 * @param original
 * @param foreign
 */
export function isSubset(original, foreign) {
  for (const key of Object.keys(original)) {
    if (typeof original[key] === "object" && original[key] !== null) {
      if (!isSubset(original[key], foreign[key])) {
        return false;
      }
    } else {
      if (!(key in foreign) || original[key] !== foreign[key]) {
        return false;
      }
    }
  }
  return true;
}

/**
 *
 * @param originalPath
 * @param foreignPath
 */
export async function compareJsonFiles(originalPath, foreignPath) {
  const originalContent = JSON.parse(
    await fs.promises.readFile(originalPath, "utf-8"),
  );
  const foreignContent = JSON.parse(
    await fs.promises.readFile(foreignPath, "utf-8"),
  );

  return isSubset(originalContent, foreignContent);
}

/**
 *
 * @param originalPath
 * @param foreignPath
 */
export async function compareIgnoreFiles(originalPath, foreignPath) {
  const originalContent = await fs.promises.readFile(originalPath, "utf-8");
  const foreignContent = await fs.promises.readFile(foreignPath, "utf-8");

  const originalLines = new Set(
    originalContent.split("\n").filter((line) => line.trim()),
  );
  const foreignLines = new Set(foreignContent.split("\n"));

  for (const line of originalLines) {
    if (!foreignLines.has(line)) {
      return false;
    }
  }
  return true;
}

/**
 *
 * @param markdownItTokens
 */
export async function convertMarkdownItTokenToCinnabarMarkup(markdownItTokens) {
  const markup = new CftmBuilder();

  let lastTag = "";

  for (const token of markdownItTokens) {
    if (token.type === "inline" && lastTag !== "") {
      console.log(lastTag, token.content);
      // markup.add(lastTag, token.content);
    }
    lastTag = token.tag;
  }

  return markup.build();
}
