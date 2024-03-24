import fs from "fs";
import path from "path";

export async function checkExistence(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function checkForGit(directoryPath) {
  try {
    await fs.promises.access(path.resolve(directoryPath, ".git"));
    return true;
  } catch {
    return false;
  }
}

async function checkForPackageJson(directoryPath) {
  const filePath = path.resolve(directoryPath, "package.json");
  return await fs.promises
    .access(filePath)
    .then(() => {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const versionJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return `v${versionJson.version}`;
    })
    .catch(() => {
      return null;
    });
}

async function checkForCinnabarJson(directoryPath) {
  const filePath = path.resolve(directoryPath, "cinnabar.json");
  return await fs.promises
    .access(filePath)
    .then(() => {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const cinnabarJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return `v${cinnabarJson.version.text}`;
    })
    .catch(() => {
      return null;
    });
}

async function checkForVersionJson(directoryPath) {
  const filePath = path.resolve(directoryPath, "version.json");
  return await fs.promises
    .access(filePath)
    .then(() => {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const versionJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return `v${versionJson.major}.${versionJson.minor}.${versionJson.patch}`;
    })
    .catch(() => {
      return null;
    });
}

export async function getDirectoryVersion(directoryPath) {
  let prefix = "";
  let version = await checkForCinnabarJson(directoryPath);

  if (version == null) {
    version = await checkForVersionJson(directoryPath);
    prefix = " (cf-v)";
  }

  if (version == null) {
    version = await checkForPackageJson(directoryPath);
    prefix = " (npm)";
  }

  if (version == null) {
    version = "-";
    prefix = "";
  }

  return version + prefix;
}

export async function checkForConvention(workspace, requestIssues = false) {
  if (workspace.convention == null) {
    return !requestIssues ? true : [];
  }
  const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
  const conventionPath = path.resolve(
    path.join(
      scriptDirectory,
      "..",
      "conventions",
      workspace.convention + ".js",
    ),
  );
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (fs.existsSync(conventionPath)) {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const { checkConventionAdherence } = await import(conventionPath);
    return await checkConventionAdherence(
      workspace,
      path.dirname(conventionPath),
      requestIssues,
    );
  }
  return !requestIssues ? true : [];
}
