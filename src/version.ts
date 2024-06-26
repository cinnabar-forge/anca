import { readFolderJson } from "./utils.js";

/**
 *
 * @param directoryPath
 */
export async function getDirectoryVersion(directoryPath: string) {
  let prefix = "";
  const cinnabarJson = await readFolderJson(directoryPath, "cinnabar.json");

  let version;

  if (cinnabarJson != null) {
    version = `v${cinnabarJson.version.text}`;
  }

  const versionJson = await readFolderJson(directoryPath, "version.json");

  if (version == null && versionJson != null) {
    version = `v${versionJson.major}.${versionJson.minor}.${versionJson.patch}`;
    prefix = " (cf-v)";
  }

  const packageJson = await readFolderJson(directoryPath, "package.json");

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