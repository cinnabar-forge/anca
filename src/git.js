import fs from "fs";
import simpleGit from "simple-git";

import { checkForDirectory, checkForGit } from "./check.js";

export class GitManager {
  constructor(config) {
    this.config = config;
    this.git = simpleGit();
  }

  async createFolders() {
    for (const workspace of this.config.projects) {
      if (!(await checkForDirectory(workspace.folderPath))) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.promises.mkdir(workspace.folderPath, { recursive: true });
      }
    }

    for (const workspace of this.config.workspaces) {
      if (!(await checkForDirectory(workspace.folderPath))) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.promises.mkdir(workspace.folderPath, { recursive: true });
      }
    }
  }

  async getWorkspaceStatus(workspace) {
    const exists = await checkForDirectory(workspace.fullPath);
    if (!exists) {
      return ["-"];
    }

    const statuses = [];

    const gitExists = await checkForGit(workspace.fullPath);
    if (gitExists) {
      await this.git.cwd(workspace.fullPath);
      const statusSummary = await this.git.status();

      statuses.push(
        statusSummary.behind > 0 || statusSummary.ahead > 0
          ? "sync-pending"
          : "synced",
      );

      if (statusSummary.files.length > 0) {
        statuses.push("edited");
      }
    } else {
      statuses.push("non-git");
    }

    return statuses;
  }

  async manageWorkspaces(specificWorkspaceName, fetch) {
    const workspacesToProcess = specificWorkspaceName
      ? this.config.workspaces.filter((ws) => ws.name === specificWorkspaceName)
      : this.config.workspaces;

    for (const workspace of workspacesToProcess) {
      await this.syncWorkspace(workspace, fetch, false, false);
    }
  }

  async syncWorkspace(workspace, fetch, init, clone) {
    if (workspace.gitRepo == null) {
      return;
    }
    const folderExists = await checkForDirectory(workspace.fullPath);
    const gitExists = await checkForGit(workspace.fullPath);
    if (fetch && folderExists && gitExists) {
      await this.git.cwd(workspace.fullPath).fetch();
    } else if (init && folderExists) {
      await this.git.cwd(workspace.fullPath).init();
    } else if (clone) {
      await this.git.clone(workspace.gitRepo, workspace.fullPath);
    }
  }
}
