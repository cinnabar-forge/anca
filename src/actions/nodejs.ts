/* eslint-disable sonarjs/no-duplicate-string */
import { promptText } from "clivo";

import { fetchNpmPackagesVersion } from "../api/nodejs-npm.js";
import { AncaDevelopment } from "../schema.js";
import { writeFolderJsonFile } from "../utils.js";

export interface NodejsPackageJson {
  author?: {
    email: string;
    name: string;
    url: string;
  };
  bin?: Record<string, string>;
  dependencies?: Record<string, string>;
  description?: string;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  files?: string[];
  keywords?: string[];
  license?: string;
  main?: string;
  name?: string;
  "pre-commit"?: string[];
  repository?: {
    type: string;
    url: string;
  };
  scripts?: Record<string, string>;
  type?: string;
  types?: string;
  version?: string;
}

const FILES = ["bin", "dist"];

const SCRIPTS_APP: Record<string, string> = {
  build: "node esbuild.js",
  "build:dev": "tsc",
  "build:sea": "node sea.build.js",
  dev: "tsc-watch",
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
  "tsc-watch",
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
  "tsc-watch",
  "tsup",
  "typescript",
];

const ENGINES: Record<string, string> = {
  node: ">=18",
};

const PRECOMMIT = ["test"];

const FILE_PATH = "package.json";

/**
 *
 * @param development
 */
export async function checkNodejsPackageJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.jsonFiles[FILE_PATH] as NodejsPackageJson;
  if (contents == null) {
    return false;
  }
  if (contents.name == null) {
    return false;
  }

  if (contents.version == null) {
    return false;
  }

  if (contents.description == null) {
    return false;
  }

  if (contents.keywords == null) {
    return false;
  }

  if (contents.repository == null) {
    return false;
  }

  if (contents.license == null) {
    return false;
  }

  if (contents.author == null) {
    return false;
  }

  if (contents.type !== "module") {
    return false;
  }

  if (contents.main !== "dist/index.js") {
    return false;
  }

  if (
    development.state.config.type === "app" &&
    contents.types !== "dist/index.d.ts"
  ) {
    return false;
  }

  if (development.state.config.type === "app" && contents.bin == null) {
    return false;
  }

  if (contents.files == null) {
    return false;
  }

  if (contents.scripts == null) {
    return false;
  }

  if (contents.dependencies == null) {
    return false;
  }

  if (contents.devDependencies == null) {
    return false;
  }

  if (contents.engines == null) {
    return false;
  }

  // eslint-disable-next-line sonarjs/prefer-single-boolean-return
  if (contents["pre-commit"] == null) {
    return false;
  }

  return true;
}

/**
 * Fix the Anca configuration file.
 * @param development
 */
export async function fixNodejsPackageJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  if (development.state.jsonFiles["package.json"] == null) {
    development.state.jsonFiles["package.json"] = {};
  }
  const contents: NodejsPackageJson =
    development.state.jsonFiles["package.json"];

  if (contents.name == null) {
    contents.name = await promptText("\nPackage name");
  }

  if (contents.version == null) {
    contents.version = "0.0.0";
  }

  if (contents.description == null) {
    contents.description = await promptText("\nPackage description");
  }

  if (contents.keywords == null) {
    contents.keywords = (
      await promptText("\nPackage keywords (word1,word two,word3,...)")
    ).split(",");
  }

  if (contents.repository == null) {
    contents.repository = {
      type: "git",
      url: "git+" + (await promptText("\nRepository URL")),
    };
  }

  if (contents.license == null) {
    contents.license = "ISC";
  }

  if (contents.author == null) {
    contents.author = {
      name: await promptText("\nAuthor name"),
      // eslint-disable-next-line perfectionist/sort-objects
      email: await promptText("\nAuthor email"),
      url: await promptText("\nAuthor website"),
    };
  }

  if (contents.type !== "module") {
    contents.type = "module";
  }

  if (contents.main !== "dist/index.js") {
    contents.main = "dist/index.js";
  }

  if (
    development.state.config.type === "app" &&
    contents.types !== "dist/index.d.ts"
  ) {
    contents.types = "dist/index.d.ts";
  }

  if (development.state.config.type === "app" && contents.bin == null) {
    contents.bin = {};
  }

  if (contents.files == null) {
    contents.files = FILES;
  }

  if (contents.scripts == null) {
    contents.scripts =
      development.state.config.type === "app" ? SCRIPTS_APP : SCRIPTS_LIB;
  } else {
    if (development.state.config.type === "app") {
      for (const key in SCRIPTS_APP) {
        if (contents.scripts[key] == null) {
          contents.scripts[key] = SCRIPTS_APP[key];
        }
      }
    } else {
      for (const key in SCRIPTS_LIB) {
        if (contents.scripts[key] == null) {
          contents.scripts[key] = SCRIPTS_LIB[key];
        }
      }
    }
  }

  await checkNodejsPackageJsonDependencies(development);

  await checkNodejsPackageJsonDevDependencies(development);

  if (contents.engines == null) {
    contents.engines = ENGINES;
  } else {
    for (const key in ENGINES) {
      if (contents.engines[key] == null) {
        contents.engines[key] = ENGINES[key];
      }
    }
  }

  if (contents["pre-commit"] == null) {
    contents["pre-commit"] = PRECOMMIT;
  }
}

/**
 *
 * @param development
 */
export async function checkNodejsPackageJsonDependencies(
  development: AncaDevelopment,
) {
  if (development.state == null) {
    return;
  }
  const contents: NodejsPackageJson | null | undefined =
    development.state.jsonFiles["package.json"];

  if (contents == null) {
    return;
  }

  if (contents.dependencies == null) {
    contents.dependencies = {};
  }

  const dependencyKeys = Object.keys(contents.dependencies);

  try {
    const fetchedVersions = await fetchNpmPackagesVersion(dependencyKeys);

    for (const pkg of dependencyKeys) {
      if (fetchedVersions[pkg] !== contents.dependencies[pkg]) {
        console.log(
          `Updating dep '${pkg}' from ${contents.dependencies[pkg]} to ${fetchedVersions[pkg]}`,
        );
      }
      contents.dependencies[pkg] = fetchedVersions[pkg];
    }
  } catch (error) {
    console.error("Error updating devDependencies:", error);
  }
}

/**
 *
 * @param development
 */
export async function checkNodejsPackageJsonDevDependencies(
  development: AncaDevelopment,
) {
  if (development.state == null) {
    return;
  }
  const contents: NodejsPackageJson | null | undefined =
    development.state.jsonFiles["package.json"];

  if (contents == null) {
    return;
  }

  if (contents.devDependencies == null) {
    contents.devDependencies = {};
  }

  const devDependencies =
    development.state.config.type === "app"
      ? DEV_DEPENDENCIES_APP
      : DEV_DEPENDENCIES_LIB;

  try {
    const fetchedVersions = await fetchNpmPackagesVersion(devDependencies);

    for (const pkg of devDependencies) {
      if (fetchedVersions[pkg] !== contents.devDependencies[pkg]) {
        console.log(
          `Updating dev-dep '${pkg}' from ${contents.devDependencies[pkg]} to ${fetchedVersions[pkg]}`,
        );
      }
      contents.devDependencies[pkg] = fetchedVersions[pkg];
    }
  } catch (error) {
    console.error("Error updating devDependencies:", error);
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
