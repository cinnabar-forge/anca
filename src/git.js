import fs from "fs";
import path from "path";
import simpleGit from "simple-git";

import { checkExistence, checkForGit } from "./utils.js";

export class GitManager {
  constructor(config) {
    this.config = config;
    this.git = simpleGit();
  }

  async createFolders() {
    for (const workspace of this.config.projects) {
      if (!(await checkExistence(workspace.folderPath))) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.promises.mkdir(workspace.folderPath, { recursive: true });
      }
    }

    for (const workspace of this.config.workspaces) {
      if (!(await checkExistence(workspace.folderPath))) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await fs.promises.mkdir(workspace.folderPath, { recursive: true });
      }
    }
  }

  async getWorkspaceStatus(workspace) {
    const exists = await checkExistence(workspace.fullPath);
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

    if (workspace.convention != null) {
      const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
      const conventionPath = path.resolve(
        path.join(
          scriptDirectory,
          "..",
          "conventions",
          workspace.convention + ".js",
        ),
      );
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      if (fs.existsSync(conventionPath)) {
        // eslint-disable-next-line node/no-unsupported-features/es-syntax
        const { checkConventionAdherence } = await import(conventionPath);
        if (
          !(await checkConventionAdherence(
            workspace,
            path.dirname(conventionPath),
          ))
        ) {
          statuses.push("convention-broke");
        }
      }
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
    const folderExists = await checkExistence(workspace.fullPath);
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
