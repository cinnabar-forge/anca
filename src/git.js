import fs from "fs";
import simpleGit from "simple-git";

import { checkForDirectory, checkForGit } from "./check.js";

export class GitWorkspaceManager {
  constructor(workspaces) {
    this.workspaces = workspaces;
    this.git = simpleGit();
  }

  async createWorkspaceFolders() {
    for (const workspace of this.workspaces) {
      if (!(await checkForDirectory(workspace.folderPath))) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.promises.mkdir(workspace.folderPath, { recursive: true });
      }
    }
  }

  async determineWorkspaceStatus(workspace) {
    const exists = await checkForDirectory(workspace.fullPath);
    if (!exists) {
      return ["-"];
    }

    const statuses = [];

    const gitExists = await checkForGit(workspace.fullPath);
    if (gitExists) {
      await this.git.cwd(workspace.fullPath);
      const statusSummary = await this.git.status();

      if (statusSummary.files.length > 0) {
        statuses.push("edited");
      }

      statuses.push(
        statusSummary.behind > 0 || statusSummary.ahead > 0
          ? "to-be-synced"
          : "synced",
      );
    } else {
      statuses.push("non-git");
    }

    return statuses;
  }

  async manageWorkspaces(specificWorkspaceName = "") {
    const workspacesToProcess = specificWorkspaceName
      ? this.workspaces.filter((ws) => ws.name === specificWorkspaceName)
      : this.workspaces;

    for (const workspace of workspacesToProcess) {
      this.syncWorkspace(workspace, false, false, false);
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
