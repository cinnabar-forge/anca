import fs from "fs";
import path from "path";

export async function checkForDirectory(directoryPath) {
  try {
    await fs.promises.access(directoryPath);
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
  let prefix = ""
  let version = await checkForCinnabarJson(directoryPath);

  if (version == null) {
    version = await checkForVersionJson(directoryPath);
    prefix = " (cf-v)"
  }

  if (version == null) {
    version = await checkForPackageJson(directoryPath);
    prefix = " (npm)"
  }

  if (version == null) {
    version = "-";
    prefix = "";
  }

  return version + prefix;
}
