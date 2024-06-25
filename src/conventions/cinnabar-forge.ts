// import { CftmBuilder } from "cftm";
import fs from "fs";
import MarkdownIt from "markdown-it";
import path from "path";

import {
  checkExistence,
  compareIgnoreFiles,
  compareJsonFiles,
} from "../utils.js";

// # Logs
// logs
// *.log
// npm-debug.log*
// yarn-debug.log*
// yarn-error.log*
// pnpm-debug.log*
// lerna-debug.log*
// report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

// # Dependency directories
// node_modules/
// jspm_packages/
// .yarn/cache
// .yarn/unplugged
// .yarn/build-state.yml
// .yarn/install-state.gz
// .pnp.*
// .yarn-integrity

// # Runtime data
// pids
// *.pid
// *.seed
// *.pid.lock

// # Editor directories and files
// .idea
// .DS_Store
// *.suo
// *.ntvs*
// *.njsproj
// *.sln
// *.sw?
// .vscode

// # Built sources
// /dist
// /build
// *.spec

// # Output of 'npm pack'
// *.tgz

// # Local settings
// .env
// .env.development.local
// .env.test.local
// .env.production.local
// .env.local
// config.json

// # Data
// /data
// /public/assets

// # General
// **/.git
// **/.svn
// **/.hg

// # Node.js
// **/node_modules
// package-lock.json

// # Cinnabar Forge
// **/cinnabar.js
// cinnabar.json

const nodejsFiles = [
  ".eslintignore",
  ".eslintrc.json",
  ".gitignore",
  ".prettierignore",
  ".prettierrc",
];

const specialNodejsFiles = ["README.md", "package.json"];

/**
 *
 * @param issues
 * @param requestIssues
 * @param filePath
 */
async function checkPackageJson(issues, requestIssues, filePath) {
  const content = JSON.parse(await fs.promises.readFile(filePath, "utf-8"));

  if (!content.keywords) {
    if (requestIssues) {
      issues.push({
        label: `[package.json] Add 'keywords'`,
        name: "no-" + issues.length,
        refreshTable: true,
      });
    } else {
      return false;
    }
  }

  return true;
}

/**
 *
 * @param development
 * @param issues
 * @param requestIssues
 * @param filePath
 */
async function checkReadmeMd(development, issues, requestIssues, filePath) {
  const content = await fs.promises.readFile(filePath, "utf-8");

  const md = new MarkdownIt();
  try {
    md.parse(content);
  } catch (e) {
    if (requestIssues) {
      issues.push({
        label: `[README.md] Parsing error (${e.message})`,
        name: "no-" + issues.length,
        refreshTable: true,
      });
    }
    return false;
  }
  // const developmentMarkup = await convertMarkdownItTokenToCinnabarMarkup(
  //   md.parse(content),
  // );

  // const etalonMarkupBuilder = new CftmBuilder();

  if (development.stack === "nodejs") {
    // checkReadmeMdNodeJs(development, etalonMarkupBuilder);
  }

  // const etalonMarkup = etalonMarkupBuilder.build();

  return true;
}

/**
 *
 * @param development
 * @param markup
 * @param markupBuilder
 */
function checkReadmeMdNodeJs(development, markupBuilder) {
  const name =
    development.cinnabarJson?.name ??
    development.packageJson?.name ??
    development.versionJson?.name ??
    development.name;

  markupBuilder.h1(name);

  // const description =
  //   development.cinnabarJson?.description ?? development.packageJson?.description;
  // if (description != null) {
  //   markupBuilder.p(description);
  // }

  markupBuilder.h2("Getting Started");

  markupBuilder.h2("Contributing");

  markupBuilder.h2("License").p("Install anna globally using npm:");

  markupBuilder.h2("Authors");

  return markupBuilder.build();
}

/**
 *
 * @param issues
 * @param requestIssues
 * @param createFileCallback
 * @param fileName
 * @param etalonFilePath
 * @param developmentFilePath
 */
async function checkFiles(
  issues,
  requestIssues,
  createFileCallback,
  fileName,
  etalonFilePath,
  developmentFilePath,
) {
  const adherence =
    fileName.endsWith(".json") || fileName === ".prettierrc"
      ? await compareJsonFiles(etalonFilePath, developmentFilePath)
      : await compareIgnoreFiles(etalonFilePath, developmentFilePath);

  if (!adherence) {
    if (requestIssues) {
      issues.push({
        callback: createFileCallback,
        label: `Recreate ${fileName}`,
        name: "no-" + issues.length,
        refreshTable: true,
      });
    } else {
      return false;
    }
  }
}

/**
 *
 * @param development
 * @param conventionsPath
 * @param requestIssues
 */
export async function checkConventionAdherence(
  development,
  conventionsPath,
  requestIssues = false,
) {
  const issues = [];

  if (development.stack === "nodejs") {
    for (const fileName of specialNodejsFiles) {
      const developmentFilePath = path.resolve(development.fullPath, fileName);

      if (!(await checkExistence(developmentFilePath))) {
        if (requestIssues) {
          issues.push({
            label: `${fileName} is not presented`,
            name: "no-" + issues.length,
            refreshTable: true,
          });
          continue;
        } else {
          return false;
        }
      }

      if (fileName === "package.json") {
        await checkPackageJson(issues, requestIssues, developmentFilePath);
      } else if (fileName === "README.md") {
        await checkReadmeMd(
          development,
          issues,
          requestIssues,
          developmentFilePath,
        );
      }
    }

    for (const fileName of nodejsFiles) {
      const etalonName = "etalon" + fileName;

      const etalonFilePath = path.resolve(
        conventionsPath,
        "cinnabar-forge",
        etalonName,
      );
      const developmentFilePath = path.resolve(development.fullPath, fileName);

      const createFileCallback = async () => {
        await fs.promises.copyFile(etalonFilePath, developmentFilePath);
      };

      if (!(await checkExistence(developmentFilePath))) {
        if (requestIssues) {
          issues.push({
            callback: createFileCallback,
            label: `Create ${fileName}`,
            name: "no-" + issues.length,
            refreshTable: true,
          });
          continue;
        } else {
          return false;
        }
      }

      checkFiles(
        issues,
        requestIssues,
        createFileCallback,
        fileName,
        etalonFilePath,
        developmentFilePath,
      );
    }
  }

  return !requestIssues ? true : issues;
}
