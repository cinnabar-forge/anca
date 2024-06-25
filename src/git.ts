import fs from "fs";
import simpleGit, { SimpleGit } from "simple-git";

import { getState } from "./config.js";
import { AncaDevelopmentState } from "./schema.js";
import { checkExistence, checkForGit } from "./utils.js";

const git = simpleGit();

/**
 *
 */
export function getGit(): SimpleGit {
  return git;
}

/**
 *
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
 *
 * @param specificDevelopmentName
 * @param fetch
 */
export async function manageDevelopments(
  specificDevelopmentName,
  fetch: boolean,
) {
  const developmentsToProcess = specificDevelopmentName
    ? getState().developments.filter(
        (ws: AncaDevelopmentState) => ws.data.name === specificDevelopmentName,
      )
    : getState().developments;

  for (const development of developmentsToProcess) {
    await syncDevelopment(development, fetch, false, false);
  }
}

/**
 *
 * @param development
 * @param fetch
 * @param init
 * @param clone
 */
export async function syncDevelopment(
  development: AncaDevelopmentState,
  fetch: boolean,
  init: boolean,
  clone: boolean,
) {
  if (development.data.gitOrigin == null) {
    return;
  }
  const folderExists = await checkExistence(development.fullPath);
  const gitExists = await checkForGit(development.fullPath);
  if (fetch && folderExists && gitExists) {
    await git.cwd(development.fullPath).fetch();
  } else if (init && folderExists) {
    await git.cwd(development.fullPath).init();
  } else if (clone) {
    await git.clone(development.data.gitOrigin, development.fullPath);
  }
}
