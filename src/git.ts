import fs from "fs";
import simpleGit, { SimpleGit } from "simple-git";

import { getState } from "./config.js";
import { AncaDevelopmentState } from "./schema.js";
import { checkExistence, checkForGit } from "./utils.js";

const git = simpleGit();

/**
 * Gets SimpleGit singleton instance
 * @returns {SimpleGit} SimpleGit instance
 */
export function getGit(): SimpleGit {
  return git;
}

/**
 * Creates folders in the workfolder
 */
export async function createFolders() {
  for (const deployment of getState().deployments) {
    if (!(await checkExistence(deployment.folderPath))) {
      await fs.promises.mkdir(deployment.folderPath, { recursive: true });
    }
  }

  for (const development of getState().developments) {
    if (!(await checkExistence(development.folderPath))) {
      await fs.promises.mkdir(development.folderPath, { recursive: true });
    }
  }
}

/**
 * Performs specified git operations on the repo
 * @param {AncaDevelopmentState} development
 */
export async function syncDevelopment(development: AncaDevelopmentState) {
  if (development.data.gitOrigin == null) {
    return;
  }
  const folderExists = await checkExistence(development.fullPath);
  const gitExists = await checkForGit(development.fullPath);
  if (folderExists && gitExists) {
    await git.cwd(development.fullPath).fetch();
  } else if (folderExists) {
    await git.cwd(development.fullPath).init();
  } else {
    await git.clone(development.data.gitOrigin, development.fullPath);
  }
}
