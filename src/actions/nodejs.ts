/* eslint-disable sonarjs/no-duplicate-string */
import { promptText } from "clivo";

import { fetchNpmPackageVersion } from "../api/nodejs-npm.js";
import { AncaDevelopment, AncaDevelopmentState } from "../schema.js";
import { writeFolderFile } from "../utils.js";

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
  test: "prettier . -c && eslint --max-warnings 0 . && tsc && mocha './build/dev/test'",
};

const SCRIPTS_LIB: Record<string, string> = {
  build: "tsup",
  "build:dev": "tsc",
  fix: "prettier . --write && eslint --fix .",
  format: "prettier . --write",
  lint: "eslint --fix .",
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

/**
 *
 * @param state
 * @param contents
 */
export function checkNodejsPackageJson(
  state: AncaDevelopmentState,
  contents: NodejsPackageJson,
) {
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

  if (state.config.type === "app" && contents.types !== "dist/index.d.ts") {
    return false;
  }

  if (state.config.type === "app" && contents.bin == null) {
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
 * @param state
 */
export async function fixNodejsPackageJson(state: AncaDevelopmentState) {
  if (state.jsonFiles["package.json"] == null) {
    state.jsonFiles["package.json"] = {};
  }
  const contents: NodejsPackageJson = state.jsonFiles["package.json"];

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

  if (state.config.type === "app" && contents.types !== "dist/index.d.ts") {
    contents.types = "dist/index.d.ts";
  }

  if (state.config.type === "app" && contents.bin == null) {
    contents.bin = {};
  }

  if (contents.files == null) {
    contents.files = FILES;
  }

  if (contents.scripts == null) {
    contents.scripts = state.config.type === "app" ? SCRIPTS_APP : SCRIPTS_LIB;
  } else {
    if (state.config.type === "app") {
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

  if (contents.dependencies == null) {
    contents.dependencies = {};
  }

  await checkNodejsPackageJsonDevDependencies(state);

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
 * @param state
 */
export async function checkNodejsPackageJsonDevDependencies(
  state: AncaDevelopmentState,
) {
  const contents: NodejsPackageJson = state.jsonFiles["package.json"];

  if (contents.devDependencies == null) {
    contents.devDependencies = {};
  }

  const devDependencies =
    state.config.type === "app" ? DEV_DEPENDENCIES_APP : DEV_DEPENDENCIES_LIB;

  for (const key of devDependencies) {
    contents.devDependencies[key] = fetchNpmPackageVersion(key);
  }
}

/**
 *
 * @param development
 */
export async function writeNodejsPackageJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    "package.json",
    JSON.stringify(development.state.jsonFiles["package.json"], null, 2),
  );
}
