import { CinnabarMarkupBuilder } from "@cinnabar-forge/markup";
import fs from "fs";
import MarkdownIt from "markdown-it";
import path from "path";

import {
  checkExistence,
  compareIgnoreFiles,
  compareJsonFiles,
  convertMarkdownItTokenToCinnabarMarkup,
} from "../src/utils.js";

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
 * @param workspace
 * @param issues
 * @param requestIssues
 * @param filePath
 */
async function checkReadmeMd(workspace, issues, requestIssues, filePath) {
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
  const workspaceMarkup = await convertMarkdownItTokenToCinnabarMarkup(
    md.parse(content),
  );

  const etalonMarkupBuilder = new CinnabarMarkupBuilder();

  if (workspace.stack === "nodejs") {
    checkReadmeMdNodeJs(workspace, etalonMarkupBuilder);
  }

  const etalonMarkup = etalonMarkupBuilder.build();

  if (workspace.name === "anna") {
    await fs.promises.writeFile(
      filePath + ".1.cfm.json",
      JSON.stringify(workspaceMarkup),
    );
    await fs.promises.writeFile(
      filePath + ".2.cfm.json",
      JSON.stringify(etalonMarkup),
    );
  }

  return true;
}

/**
 *
 * @param workspace
 * @param markup
 */
function checkReadmeMdNodeJs(workspace, markupBuilder) {
  const name =
    workspace.cinnabarJson?.name ??
    workspace.packageJson?.name ??
    workspace.versionJson?.name ??
    workspace.name;

  markupBuilder.h1(name);

  // const description =
  //   workspace.cinnabarJson?.description ?? workspace.packageJson?.description;
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
 * @param workspaceFilePath
 */
async function checkFiles(
  issues,
  requestIssues,
  createFileCallback,
  fileName,
  etalonFilePath,
  workspaceFilePath,
) {
  const adherence =
    fileName.endsWith(".json") || fileName === ".prettierrc"
      ? await compareJsonFiles(etalonFilePath, workspaceFilePath)
      : await compareIgnoreFiles(etalonFilePath, workspaceFilePath);

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
 * @param workspace
 * @param conventionsPath
 * @param requestIssues
 */
export async function checkConventionAdherence(
  workspace,
  conventionsPath,
  requestIssues = false,
) {
  const issues = [];

  if (workspace.stack === "nodejs") {
    for (const fileName of specialNodejsFiles) {
      const workspaceFilePath = path.resolve(workspace.fullPath, fileName);

      if (!(await checkExistence(workspaceFilePath))) {
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
        await checkPackageJson(issues, requestIssues, workspaceFilePath);
      } else if (fileName === "README.md") {
        await checkReadmeMd(
          workspace,
          issues,
          requestIssues,
          workspaceFilePath,
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
      const workspaceFilePath = path.resolve(workspace.fullPath, fileName);

      const createFileCallback = async () => {
        await fs.promises.copyFile(etalonFilePath, workspaceFilePath);
      };

      if (!(await checkExistence(workspaceFilePath))) {
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
        workspaceFilePath,
      );
    }
  }

  return !requestIssues ? true : issues;
}
