/* eslint-disable sonarjs/no-duplicate-string */
import { exec } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { promptText } from "clivo";

import { fetchNpmPackagesVersion } from "../api/nodejs-npm.js";
import type { AncaConfig, AncaDevelopment } from "../schema.js";
import { writeFolderJsonFile } from "../utils.js";

export interface NodeJsPackageAuthor {
  email?: string;
  name: string;
  url?: string;
}

export interface NodejsPackageJson {
  author?: NodeJsPackageAuthor | null;
  bin?: null | Record<string, string>;
  bugs?: null | string;
  contributors?: NodeJsPackageAuthor[] | null;
  dependencies?: null | Record<string, string>;
  description?: null | string;
  devDependencies?: null | Record<string, string>;
  engines?: null | Record<string, string>;
  files?: null | string[];
  funding?: null | string;
  homepage?: null | string;
  keywords?: null | string[];
  license?: null | string;
  main?: null | string;
  name?: null | string;
  "pre-commit"?: null | string[];
  repository?: {
    type: string;
    url: string;
  } | null;
  scripts?: null | Record<string, string>;
  type?: null | string;
  types?: null | string;
  version?: null | string;
}

export type NpmUpdate = { name: string; version: string }[];

interface NodejsPackageJson2 extends NodejsPackageJson {
  // biome-ignore lint/suspicious/noExplicitAny: Node.js package.json types will be imported later
  [key: string]: any;
}

const packageNameOrder = [
  "name",
  "version",
  "description",
  "keywords",
  "homepage",
  "bugs",
  "license",
  "author",
  "contributors",
  "funding",
  "files",
  "type",
  "main",
  "types",
  "browser",
  "bin",
  "man",
  "directories",
  "repository",
  "scripts",
  "config",
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "bundleDependencies",
  "optionalDependencies",
  "overrides",
  "engines",
  "os",
  "cpu",
  "private",
  "publishConfig",
  "workspaces",
  "pre-commit",
];

const SCRIPTS_API: Record<string, string> = {
  build: "node esbuild.js",
  "build:bundle": "node esbuild.js full",
  "build:dev": "tsc",
  "build:sea": "node sea.build.js",
  dev: "node esbuild.js watch",
  fix: "prettier . --write && eslint --fix .",
  format: "prettier . --write",
  lint: "eslint --fix .",
  "migration:down": "knex migrate:rollback",
  "migration:ls": "npx knex migrate:list",
  "migration:restart": "knex migrate:rollback && knex migrate:latest",
  "migration:up": "knex migrate:latest",
  prepack: "npm run build",
  start: "node dist/index.js",
  test: "prettier . -c && eslint --max-warnings 0 . && tsc",
};

const SCRIPTS_APP: Record<string, string> = {
  build: "node esbuild.js",
  "build:bundle": "node esbuild.js full",
  "build:dev": "tsc",
  "build:sea": "node sea.build.js",
  dev: "node esbuild.js watch",
  fix: "prettier . --write && eslint --fix .",
  format: "prettier . --write",
  lint: "eslint --fix .",
  prepack: "npm run build",
  test: "prettier . -c && eslint --max-warnings 0 . && tsc && mocha './build/dev/test'",
};

const SCRIPTS_LIB: Record<string, string> = {
  build: "tsup",
  "build:dev": "tsc",
  fix: "prettier . --write && eslint --fix .",
  format: "prettier . --write",
  lint: "eslint --fix .",
  prepack: "npm run build",
  test: "prettier . -c && eslint --max-warnings 0 . && tsc && mocha './build/dev/test'",
};

const DEPENDENCIES_API: string[] = [
  "dotenv",
  "express",
  "helmet",
  "jsonwebtoken",
  "knex",
  "winston",
];

const DEV_DEPENDENCIES_API: string[] = [
  "@cinnabar-forge/eslint-plugin",
  "@types/express",
  "@types/jsonwebtoken",
  "esbuild",
  "typescript",
];

const DEV_DEPENDENCIES_APP: string[] = [
  "@cinnabar-forge/eslint-plugin",
  "@cinnabar-forge/meta",
  "@types/chai",
  "@types/mocha",
  "@types/node",
  "chai",
  "esbuild",
  "mocha",
  "pre-commit",
  "typescript",
];

const DEV_DEPENDENCIES_LIB: string[] = [
  "@cinnabar-forge/eslint-plugin",
  "@cinnabar-forge/meta",
  "@types/chai",
  "@types/mocha",
  "@types/node",
  "@types/sinon",
  "chai",
  "mocha",
  "pre-commit",
  "sinon",
  "tsup",
  "typescript",
];

const FORBIDDEN_DEPENDENCIES: Record<string, string> = {
  "tsc-watch": "esbuild",
};

const PRECOMMIT = ["test"];

const FILE_PATH = "package.json";

/**
 *
 * @param config
 */
function getAuthors(config: AncaConfig) {
  const authors: {
    author?: NodeJsPackageAuthor;
    contributors?: NodeJsPackageAuthor[];
  } = {};

  if (config.authors == null) {
    return authors;
  }

  for (const author of config.authors) {
    const isAuthor = author.type === "author" && authors.author == null;
    const isMaintainer =
      author.type === "maintainer" && author.status !== "retired";

    if (!isAuthor && !isMaintainer) {
      continue;
    }

    const authorNew: NodeJsPackageAuthor = { name: author.name };
    if (author.email) {
      authorNew.email = author.email;
    }
    if (author.url) {
      authorNew.url = author.url;
    }

    if (isAuthor) {
      authors.author = {
        email: author.email,
        name: author.name,
        url: author.url,
      };
    } else if (isMaintainer) {
      if (authors.contributors == null) {
        authors.contributors = [];
      }
      authors.contributors.push(authorNew);
    }
  }

  return authors;
}

/**
 *
 * @param development
 * @param full
 */
export async function checkNodejsPackageJson(
  development: AncaDevelopment,
  full: boolean,
) {
  if (development.state == null) {
    return false;
  }
  const contents = development.state.jsonFiles[FILE_PATH] as NodejsPackageJson;
  if (contents == null) {
    return false;
  }

  const config = development.state.config;

  return (
    hasName(contents, config) &&
    hasVersion(contents) &&
    hasDescription(contents, full) &&
    hasKeywords(contents, full) &&
    hasHomepage(contents, full) &&
    hasBugs(contents, full) &&
    hasLicense(contents) &&
    hasContributors(contents, config) &&
    hasFunding(contents, full) &&
    hasFiles(contents, config) &&
    hasType(contents) &&
    hasMainScript(contents) &&
    hasTypes(contents, config) &&
    hasBrowser(contents) &&
    hasBin(contents, config) &&
    hasMan(contents) &&
    hasDirectories(contents) &&
    hasRepository(contents, full) &&
    hasScripts(contents, config) &&
    hasConfig(contents) &&
    hasDependencies(contents, config) &&
    hasDevDependencies(contents, config) &&
    hasPeerDependencies(contents) &&
    hasPeerDependenciesMeta(contents) &&
    hasBundleDependencies(contents) &&
    hasOptionalDependencies(contents) &&
    hasOverrides(contents) &&
    hasEngines(contents) &&
    hasOs(contents) &&
    hasCpu(contents) &&
    hasPrivate(contents) &&
    hasPublishConfig(contents) &&
    hasWorkspaces(contents) &&
    hasPreCommit(contents, development) &&
    checkPackageJsonOrder(contents)
  );
}

/**
 *
 * @param contents
 * @param config
 */
function hasName(contents: NodejsPackageJson, config: AncaConfig) {
  return contents.name === config.namings?.npmPackage;
}

/**
 *
 * @param contents
 */
function hasVersion(contents: NodejsPackageJson) {
  return contents.version != null;
}

/**
 *
 * @param contents
 * @param full
 */
function hasDescription(contents: NodejsPackageJson, full: boolean) {
  return !full || contents.description != null;
}

/**
 *
 * @param contents
 * @param full
 */
function hasKeywords(contents: NodejsPackageJson, full: boolean) {
  return !full || contents.keywords != null;
}

/**
 *
 * @param contents
 * @param full
 */
function hasHomepage(contents: NodejsPackageJson, full: boolean) {
  return !full || contents.homepage != null;
}

/**
 *
 * @param contents
 * @param full
 */
function hasBugs(contents: NodejsPackageJson, full: boolean) {
  return !full || contents.bugs != null;
}

/**
 *
 * @param contents
 */
function hasLicense(contents: NodejsPackageJson) {
  return contents.license != null;
}

/**
 *
 * @param contents
 * @param config
 */
function hasContributors(contents: NodejsPackageJson, config: AncaConfig) {
  const authors = getAuthors(config);
  return (
    isDeepStrictEqual(authors.author, contents.author) &&
    isDeepStrictEqual(authors.contributors, contents.contributors)
  );
}

/**
 *
 * @param contents
 * @param full
 */
function hasFunding(contents: NodejsPackageJson, full: boolean) {
  return !full || contents.funding != null;
}

/**
 *
 * @param contents
 * @param config
 */
function hasFiles(contents: NodejsPackageJson, config: AncaConfig) {
  if (config.type === "app") {
    return contents.files?.[0] === "bin" && contents.files?.[1] === "dist";
  }
  if (config.type === "library") {
    return contents.files?.[0] === "dist";
  }
  return true;
}

/**
 *
 * @param contents
 */
function hasType(contents: NodejsPackageJson) {
  return contents.type === "module";
}

/**
 *
 * @param contents
 */
function hasMainScript(contents: NodejsPackageJson) {
  return contents.main === "dist/index.js";
}

/**
 *
 * @param contents
 * @param config
 */
function hasTypes(contents: NodejsPackageJson, config: AncaConfig) {
  if (config.type === "library") {
    return contents.types === "dist/index.d.ts";
  }
  return contents.types == null;
}

/**
 *
 * @param contents
 */
function hasBrowser(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 * @param config
 */
function hasBin(contents: NodejsPackageJson, config: AncaConfig) {
  if (config.type === "app") {
    return contents.bin != null;
  }
  return contents.bin == null;
}

/**
 *
 * @param contents
 */
function hasMan(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasDirectories(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 * @param full
 */
function hasRepository(contents: NodejsPackageJson, full: boolean) {
  return !full || contents.repository != null;
}

/**
 *
 * @param contents
 * @param config
 */
function hasScripts(contents: NodejsPackageJson, config: AncaConfig) {
  const scripts =
    config.type === "api"
      ? SCRIPTS_API
      : config.type === "app"
        ? SCRIPTS_APP
        : config.type === "library"
          ? SCRIPTS_LIB
          : {};

  if (
    config.type === "api" ||
    config.type === "app" ||
    config.type === "library"
  ) {
    for (const key in scripts) {
      if (
        contents.scripts == null ||
        (contents.scripts[key] !== scripts[key] &&
          !contents.scripts[key]?.startsWith(scripts[key]))
      ) {
        return false;
      }
    }
  } else {
    return contents.scripts != null;
  }
  return true;
}

/**
 *
 * @param contents
 */
function hasConfig(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 * @param config
 */
function hasDependencies(contents: NodejsPackageJson, config: AncaConfig) {
  const dependencies = config.type === "api" ? DEPENDENCIES_API : null;

  if (dependencies == null) {
    return true;
  }

  for (const key of dependencies) {
    if (
      contents.dependencies == null ||
      contents.dependencies[key] == null ||
      FORBIDDEN_DEPENDENCIES[key]
    ) {
      return false;
    }
  }

  return true;
}

/**
 *
 * @param contents
 * @param config
 */
function hasDevDependencies(contents: NodejsPackageJson, config: AncaConfig) {
  const dependencies =
    config.type === "api"
      ? DEV_DEPENDENCIES_API
      : config.type === "app"
        ? DEV_DEPENDENCIES_APP
        : config.type === "library"
          ? DEV_DEPENDENCIES_LIB
          : null;

  if (dependencies == null) {
    return true;
  }

  for (const key of dependencies) {
    if (
      contents.devDependencies == null ||
      contents.devDependencies[key] == null ||
      FORBIDDEN_DEPENDENCIES[key]
    ) {
      return false;
    }
  }

  return true;
}

/**
 *
 * @param contents
 */
function hasPeerDependencies(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasPeerDependenciesMeta(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasBundleDependencies(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasOptionalDependencies(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasOverrides(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasEngines(contents: NodejsPackageJson) {
  return contents.engines && contents.engines.node === ">=18.0.0";
}

/**
 *
 * @param contents
 */
function hasOs(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasCpu(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasPrivate(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasPublishConfig(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 */
function hasWorkspaces(contents: NodejsPackageJson) {
  contents;
  return true;
}

/**
 *
 * @param contents
 * @param development
 */
function hasPreCommit(
  contents: NodejsPackageJson,
  development: AncaDevelopment,
) {
  return development.monorepoPart != null || contents["pre-commit"] != null;
}

/**
 *
 * @param packageJson
 */
function checkPackageJsonOrder(packageJson: NodejsPackageJson) {
  const packageKeys = Object.keys(packageJson);
  let keyIndex = 0;
  let orderIndex = 0;

  while (
    keyIndex < packageKeys.length &&
    orderIndex < packageNameOrder.length
  ) {
    if (packageKeys[keyIndex] === packageNameOrder[orderIndex]) {
      keyIndex++;
    } else {
      if (packageKeys.includes(packageNameOrder[orderIndex])) {
        return false;
      }
    }
    orderIndex++;
  }

  return true;
}

/**
 * Fix the Anca configuration file.
 * @param development
 * @param full
 */
export async function fixNodejsPackageJson(
  development: AncaDevelopment,
  full: boolean,
) {
  if (development.state == null) {
    return;
  }
  const contents: NodejsPackageJson2 = (development.state.jsonFiles[
    "package.json"
  ] || {}) as NodejsPackageJson2;

  const rebuildFile: NodejsPackageJson2 = {};

  const config = development.state.config;

  await fixPackageName(rebuildFile, contents, config);
  await fixPackageVersion(rebuildFile, contents);
  await fixPackageDescription(rebuildFile, contents, full);
  await fixPackageKeywords(rebuildFile, contents, full);
  await fixPackageHomepage(rebuildFile, contents, full);
  await fixPackageBugs(rebuildFile, contents, full);
  await fixPackageLicense(rebuildFile, contents);
  await fixPackageContributors(rebuildFile, contents, config);
  await fixPackageFunding(rebuildFile, contents, full);
  await fixPackageFiles(rebuildFile, contents, config);
  await fixPackageType(rebuildFile);
  await fixPackageMain(rebuildFile);
  await fixPackageTypes(rebuildFile, contents, config);
  await fixPackageBrowser(rebuildFile, contents);
  await fixPackageBin(rebuildFile, contents, config);
  await fixPackageMan(rebuildFile, contents);
  await fixPackageDirectories(rebuildFile, contents);
  await fixPackageRepository(rebuildFile, contents, full);
  await fixPackageScripts(rebuildFile, contents, config);
  await fixPackageConfig(rebuildFile, contents);
  await updateNodejsPackageJsonDependencies(
    rebuildFile,
    development,
    true,
    false,
  );
  await updateNodejsPackageJsonDevDependencies(
    rebuildFile,
    development,
    true,
    false,
  );
  await fixPackagePeerDependencies(rebuildFile, contents);
  await fixPackagePeerDependenciesMeta(rebuildFile, contents);
  await fixPackageBundleDependencies(rebuildFile, contents);
  await fixPackageOptionalDependencies(rebuildFile, contents);
  await fixPackageOverrides(rebuildFile, contents);
  await fixPackageEngines(rebuildFile);
  await fixPackageOs(rebuildFile, contents);
  await fixPackageCpu(rebuildFile, contents);
  await fixPackagePrivate(rebuildFile, contents);
  await fixPackagePublishConfig(rebuildFile, contents);
  await fixPackageWorkspaces(rebuildFile, contents);
  await fixPackagePreCommit(rebuildFile, contents, development);

  for (const key in contents) {
    if (rebuildFile[key] == null && contents[key] != null) {
      rebuildFile[key] = contents[key];
    }
  }

  development.state.jsonFiles["package.json"] = rebuildFile;
}

/**
 *
 * @param development
 */
export async function installNodejsDependencies(development: AncaDevelopment) {
  console.log("Update your dependencies with 'npm i'");
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param config
 */
async function fixPackageName(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  config: AncaConfig,
) {
  if (contents.name == null) {
    rebuildFile.name = config.namings?.npmPackage;
  } else {
    rebuildFile.name = contents.name;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageVersion(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  if (contents.version == null) {
    rebuildFile.version = "0.0.0";
  } else {
    rebuildFile.version = contents.version;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param full
 */
async function fixPackageDescription(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  full: boolean,
) {
  if (full && contents.description == null) {
    rebuildFile.description = await promptText("\nPackage description");
  } else {
    rebuildFile.description = contents.description;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param full
 */
async function fixPackageKeywords(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  full: boolean,
) {
  if (full && contents.keywords == null) {
    rebuildFile.keywords = (
      await promptText("\nPackage keywords (keyword1,keyword two,keyword3,...)")
    ).split(",");
  } else {
    rebuildFile.keywords = contents.keywords;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param full
 */
async function fixPackageHomepage(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  full: boolean,
) {
  if (full && contents.homepage == null) {
    rebuildFile.homepage = await promptText("\nPackage homepage URL");
  } else {
    rebuildFile.homepage = contents.homepage;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param full
 */
async function fixPackageBugs(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  full: boolean,
) {
  if (full && contents.bugs == null) {
    rebuildFile.bugs = await promptText("\nPackage bug report URL");
  } else {
    rebuildFile.bugs = contents.bugs;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageLicense(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  if (contents.license == null) {
    rebuildFile.license = "ISC";
  } else {
    rebuildFile.license = contents.license;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param config
 */
async function fixPackageContributors(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  config: AncaConfig,
) {
  const authors = getAuthors(config);

  if (authors.author) {
    rebuildFile.author = authors.author;
  } else {
    contents.author = null;
  }

  if (authors.contributors) {
    rebuildFile.contributors = authors.contributors;
  } else {
    contents.contributors = null;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param full
 */
async function fixPackageFunding(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  full: boolean,
) {
  if (full && contents.funding == null) {
    rebuildFile.funding = await promptText("\nPackage funding URL");
  } else {
    rebuildFile.funding = contents.funding;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param config
 */
async function fixPackageFiles(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  config: AncaConfig,
) {
  if (config.type === "app") {
    rebuildFile.files = ["bin", "dist"];
  } else if (config.type === "library") {
    rebuildFile.files = ["dist"];
  } else {
    rebuildFile.files = contents.files;
  }
}

/**
 *
 * @param rebuildFile
 */
async function fixPackageType(rebuildFile: NodejsPackageJson) {
  rebuildFile.type = "module";
}

/**
 *
 * @param rebuildFile
 */
async function fixPackageMain(rebuildFile: NodejsPackageJson) {
  rebuildFile.main = "dist/index.js";
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param config
 */
async function fixPackageTypes(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  config: AncaConfig,
) {
  if (config.type === "library") {
    rebuildFile.types = "dist/index.d.ts";
  } else {
    contents.types = null;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageBrowser(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param config
 */
async function fixPackageBin(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  config: AncaConfig,
) {
  if (config.type === "app") {
    if (contents.bin == null) {
      rebuildFile.bin = {};
    } else {
      rebuildFile.bin = contents.bin;
    }
  } else {
    contents.bin = null;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageMan(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageDirectories(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param full
 */
async function fixPackageRepository(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  full: boolean,
) {
  "ed";
  if (full && contents.repository == null) {
    rebuildFile.repository = {
      type: "git",
      url: `git+${await promptText("\nRepository URL")}`,
    };
  } else {
    rebuildFile.repository = contents.repository;
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param config
 */
async function fixPackageScripts(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  config: AncaConfig,
) {
  const scripts =
    config.type === "api"
      ? SCRIPTS_API
      : config.type === "app"
        ? SCRIPTS_APP
        : config.type === "library"
          ? SCRIPTS_LIB
          : {};

  if (contents.scripts == null) {
    rebuildFile.scripts = scripts;
  } else {
    rebuildFile.scripts = {};
    for (const key in scripts) {
      if (scripts[key]) {
        rebuildFile.scripts[key] = scripts[key];
      } else {
        rebuildFile.scripts[key] = contents.scripts[key];
      }
    }
  }
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageConfig(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param development
 * @param changePackages add or remove packages to comply presets
 * @param updateVersions
 */
export async function updateNodejsPackageJsonDependencies(
  rebuildFile: NodejsPackageJson,
  development: AncaDevelopment,
  changePackages: boolean,
  updateVersions: boolean,
) {
  const updatedPackages: NpmUpdate = [];
  if (development.state == null) {
    return updatedPackages;
  }
  const contents: NodejsPackageJson | null | undefined =
    development.state.jsonFiles["package.json"];

  if (contents == null) {
    return updatedPackages;
  }

  if (contents.dependencies == null) {
    contents.dependencies = {};
  }

  rebuildFile.dependencies = {};

  const allDependencies = changePackages
    ? new Set([
        ...(development.state.config.type === "api" ? DEPENDENCIES_API : []),
        ...Object.keys(contents.dependencies),
      ])
    : Object.keys(contents.dependencies);

  const allDependenciesList = Array.from(allDependencies).sort();

  try {
    const fetchedVersions = await fetchNpmPackagesVersion(
      allDependenciesList.filter(
        (dep: string) =>
          !dep.includes("file:") &&
          (updateVersions ||
            !contents.dependencies ||
            contents.dependencies[dep] == null),
      ),
    );

    for (const pkg of allDependenciesList) {
      if (
        fetchedVersions[pkg] !== contents.dependencies[pkg] &&
        fetchedVersions[pkg]
      ) {
        console.log(
          `${updateVersions ? "Updating" : "Adding"} dep '${pkg}' from ${contents.dependencies[pkg]} to ${fetchedVersions[pkg]}`,
        );
        updatedPackages.push({ name: pkg, version: fetchedVersions[pkg] });
      } else {
        console.log(`Keeping dep '${pkg}' at ${contents.dependencies[pkg]}`);
      }
      if (!changePackages || !FORBIDDEN_DEPENDENCIES[pkg]) {
        rebuildFile.dependencies[pkg] =
          fetchedVersions[pkg] || contents.dependencies[pkg];
      }
    }
  } catch (error) {
    console.error("Error updating dependencies:", error);
  }
  return updatedPackages;
}

/**
 *
 * @param rebuildFile
 * @param development
 * @param changePackages add or remove packages to comply presets
 * @param updateVersions
 */
export async function updateNodejsPackageJsonDevDependencies(
  rebuildFile: NodejsPackageJson,
  development: AncaDevelopment,
  changePackages: boolean,
  updateVersions: boolean,
) {
  const updatedPackages: NpmUpdate = [];
  if (development.state == null) {
    return updatedPackages;
  }
  const contents: NodejsPackageJson | null | undefined =
    development.state.jsonFiles["package.json"];

  if (contents == null) {
    return updatedPackages;
  }

  if (contents.devDependencies == null) {
    contents.devDependencies = {};
  }

  rebuildFile.devDependencies = {};

  const allDevDependencies = changePackages
    ? new Set([
        ...(development.state.config.type === "api"
          ? DEV_DEPENDENCIES_API
          : development.state.config.type === "app"
            ? DEV_DEPENDENCIES_APP
            : development.state.config.type === "library"
              ? DEV_DEPENDENCIES_LIB
              : []),
        ...Object.keys(contents.devDependencies),
      ])
    : Object.keys(contents.devDependencies);

  const allDevDependenciesList = Array.from(allDevDependencies).sort();

  try {
    const fetchedVersions = await fetchNpmPackagesVersion(
      allDevDependenciesList.filter(
        (dep: string) =>
          !dep.includes("file:") &&
          (updateVersions ||
            !contents.devDependencies ||
            contents.devDependencies[dep] == null),
      ),
    );

    for (const pkg of allDevDependenciesList) {
      if (
        fetchedVersions[pkg] !== contents.devDependencies[pkg] &&
        fetchedVersions[pkg]
      ) {
        console.log(
          `${updateVersions ? "Updating" : "Adding"} dev dep '${pkg}' from ${contents.devDependencies[pkg]} to ${fetchedVersions[pkg]}`,
        );
        updatedPackages.push({ name: pkg, version: fetchedVersions[pkg] });
      } else {
        console.log(
          `Keeping dev dep '${pkg}' at ${contents.devDependencies[pkg]}`,
        );
      }
      if (!changePackages || !FORBIDDEN_DEPENDENCIES[pkg]) {
        rebuildFile.devDependencies[pkg] =
          fetchedVersions[pkg] || contents.devDependencies[pkg];
      }
    }
  } catch (error) {
    console.error("Error updating devDependencies:", error);
  }
  return updatedPackages;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackagePeerDependencies(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackagePeerDependenciesMeta(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageBundleDependencies(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageOptionalDependencies(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageOverrides(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 */
async function fixPackageEngines(rebuildFile: NodejsPackageJson) {
  rebuildFile.engines = { node: ">=18.0.0" };
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageOs(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageCpu(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackagePrivate(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackagePublishConfig(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 */
async function fixPackageWorkspaces(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
) {
  rebuildFile;
  contents;
}

/**
 *
 * @param rebuildFile
 * @param contents
 * @param development
 */
async function fixPackagePreCommit(
  rebuildFile: NodejsPackageJson,
  contents: NodejsPackageJson,
  development: AncaDevelopment,
) {
  if (contents["pre-commit"] == null) {
    contents["pre-commit"] =
      development.monorepoPart == null ? PRECOMMIT : null;
  } else {
    rebuildFile["pre-commit"] =
      development.monorepoPart == null ? contents["pre-commit"] : null;
  }
}

/**
 *
 * @param development
 */
export async function writeNodejsPackageJson(development: AncaDevelopment) {
  if (
    development.state == null ||
    development.state.jsonFiles["package.json"] == null
  ) {
    return;
  }
  await writeFolderJsonFile(
    development.fullPath,
    "package.json",
    development.state.jsonFiles["package.json"],
  );
}
