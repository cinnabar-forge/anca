import fs from "node:fs";
import path from "node:path";
import simpleGit, { type SimpleGit } from "simple-git";

const git = simpleGit();

/**
 * Gets SimpleGit singleton instance
 * @returns {SimpleGit} SimpleGit instance
 */
export function getGit(): SimpleGit {
  return git;
}

/**
 *
 * @param directoryPath
 */
export async function checkForGit(directoryPath: string) {
  try {
    await fs.promises.access(path.resolve(directoryPath, ".git"));
    return true;
  } catch {
    return false;
  }
}
