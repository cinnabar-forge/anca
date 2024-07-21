import { AncaDevelopment, AncaMeta } from "./schema.js";

interface CinnabarJson {
  description?: string;
  name?: string;
  version?: {
    major?: number;
    text?: string;
  };
}

interface VersionJson {
  major?: number;
  minor?: number;
  name?: string;
  patch?: number;
}

interface NodejsPackageJson {
  description?: string;
  name?: string;
  version?: string;
}

/**
 *
 * @param version
 */
export function parseSemver(version: string) {
  // eslint-disable-next-line security/detect-unsafe-regex
  const regex = /^(\d+)\.(\d+)\.(\d+)(?:-(\w+)(?:\.(\d+))?)?$/;
  const match = version.match(regex);
  if (match) {
    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);
    const patch = parseInt(match[3]);
    const preRelease = match[4];
    const preReleaseNumber = match[5] ? parseInt(match[5]) : undefined;
    return {
      major,
      minor,
      patch,
      preRelease,
      preReleaseNumber,
    };
  } else {
    return false;
  }
}

/**
 *
 * @param development
 */
export function getDevelopmentMeta(development: AncaDevelopment): AncaMeta {
  const meta: AncaMeta = {};

  if (development.state?.jsonFiles["cinnabar.json"] != null) {
    const cinnabarJson: CinnabarJson =
      development.state.jsonFiles["cinnabar.json"];

    if (cinnabarJson.name != null) {
      meta.name = cinnabarJson.name;
    }
    if (cinnabarJson.description != null) {
      meta.description = cinnabarJson.description;
    }
    if (cinnabarJson.version != null && cinnabarJson.version.text != null) {
      meta.version = {
        isPrerelease: false,
        isUnstable: (cinnabarJson.version.major || 0) < 1,
        text: cinnabarJson.version.text,
      };
    }
  }

  if (development.state?.jsonFiles["version.json"] != null) {
    const versionJson: VersionJson =
      development.state.jsonFiles["version.json"];

    if (meta.name == null && versionJson.name != null) {
      meta.name = versionJson.name;
    }

    if (
      meta.version == null &&
      versionJson.major != null &&
      versionJson.minor != null &&
      versionJson.patch != null
    ) {
      meta.version = {
        isPrerelease: false,
        isUnstable: (versionJson.major || 0) < 1,
        text: `${versionJson.major}.${versionJson.minor}.${versionJson.patch}`,
      };
    }
  }

  if (development.state?.jsonFiles["package.json"] != null) {
    const packageJson: NodejsPackageJson =
      development.state.jsonFiles["package.json"];

    if (meta.name == null && packageJson.name != null) {
      meta.name = packageJson.name;
    }

    if (meta.description == null && packageJson.description != null) {
      meta.description = packageJson.description;
    }

    if (meta.version == null && packageJson.version != null) {
      const version = parseSemver(packageJson.version);
      if (version) {
        meta.version = {
          isPrerelease: version.preRelease != null,
          isUnstable: version.major < 1,
          text: packageJson.version,
        };
      }
    }
  }

  return meta;
}
