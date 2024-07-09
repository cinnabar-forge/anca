import { readFolderJsonFile } from "./utils.js";

interface CinnabarJson {
  version?: {
    text?: string;
  };
}

interface VersionJson {
  major?: number;
  minor?: number;
  patch?: number;
}

interface NodejsPackageJson {
  version?: string;
}

/**
 *
 * @param directoryPath
 */
export async function getDirectoryVersion(directoryPath: string) {
  let prefix = "";
  const cinnabarJson: CinnabarJson | null = await readFolderJsonFile(
    directoryPath,
    "cinnabar.json",
  );

  let version;

  if (
    cinnabarJson != null &&
    cinnabarJson.version != null &&
    cinnabarJson.version.text != null
  ) {
    version = `v${cinnabarJson.version.text}`;
  }

  const versionJson: VersionJson | null = await readFolderJsonFile(
    directoryPath,
    "version.json",
  );

  if (version == null && versionJson != null) {
    version = `v${versionJson.major}.${versionJson.minor}.${versionJson.patch}`;
    prefix = " (cf-v)";
  }

  const packageJson: NodejsPackageJson | null = await readFolderJsonFile(
    directoryPath,
    "package.json",
  );

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
