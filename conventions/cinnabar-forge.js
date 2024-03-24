/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-object-injection */
import fs from "fs/promises";
import path from "path";

import { checkExistence } from "../src/utils.js";

const nodejsFiles = [
  ".eslintignore",
  ".eslintrc.json",
  ".gitignore",
  ".prettierignore",
  ".prettierrc",
];

async function compareJsonFiles(etalonPath, workspacePath) {
  const etalonContent = JSON.parse(await fs.readFile(etalonPath, "utf-8"));
  const workspaceContent = JSON.parse(
    await fs.readFile(workspacePath, "utf-8"),
  );

  function isSubset(etalon, workspace) {
    for (const key of Object.keys(etalon)) {
      if (typeof etalon[key] === "object" && etalon[key] !== null) {
        if (!isSubset(etalon[key], workspace[key])) {
          return false;
        }
      } else {
        if (!(key in workspace) || etalon[key] !== workspace[key]) {
          return false;
        }
      }
    }
    return true;
  }

  return isSubset(etalonContent, workspaceContent);
}

async function compareIgnoreFiles(etalonPath, workspacePath) {
  const etalonContent = await fs.readFile(etalonPath, "utf-8");
  const workspaceContent = await fs.readFile(workspacePath, "utf-8");

  const etalonLines = new Set(
    etalonContent.split("\n").filter((line) => line.trim()),
  );
  const workspaceLines = new Set(workspaceContent.split("\n"));

  for (let line of etalonLines) {
    if (!workspaceLines.has(line)) {
      return false;
    }
  }
  return true;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function checkConventionAdherence(
  workspace,
  conventionsPath,
  requestIssues = false,
) {
  const issues = [];

  if (workspace.stack === "nodejs") {
    for (const fileName of nodejsFiles) {
      const etalonName = "etalon" + fileName;

      const etalonFilePath = path.resolve(
        conventionsPath,
        "cinnabar-forge",
        etalonName,
      );
      const workspaceFilePath = path.resolve(workspace.fullPath, fileName);

      const createFileCallback = async () => {
        await fs.copyFile(etalonFilePath, workspaceFilePath);
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
  }

  return !requestIssues ? true : issues;
}
