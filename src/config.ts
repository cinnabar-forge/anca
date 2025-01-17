import fs from "node:fs";
import path from "node:path";

import {
  ANCA_WORKFOLDER_SCHEMA,
  type Anca,
  type AncaConfig,
  type AncaDeployment,
  type AncaDevelopment,
  type AncaWorkfolder,
} from "./schema.js";
import { checkExistence, verifyAjv } from "./utils.js";

let instance: Anca;

const configsCache = new Map<string, AncaConfig>();

/**
 * Gets current Anca instance
 * @returns Anca instance
 */
export function getInstance(): Anca {
  return instance;
}

/**
 *
 * @param fullPath
 */
function getMonorepo(fullPath: string) {
  const ancaJson = path.join(fullPath, "anca.json");
  if (!configsCache.has(fullPath) && fs.existsSync(ancaJson)) {
    configsCache.set(fullPath, JSON.parse(fs.readFileSync(ancaJson, "utf-8")));
  }
  return configsCache.get(fullPath)?.monorepo;
}

/**
 *
 * @param githubUrls
 */
export function getConfigFromGithub(githubUrls: string[]) {
  const config: AncaWorkfolder = {
    ancaDataVersion: 0,
    deployments: [],
    developments: [],
  };
  for (const githubUrl of githubUrls) {
    const splitted = githubUrl.split("/");
    const owner = splitted[splitted.length - 2];
    const repo = splitted[splitted.length - 1];
    console.log(githubUrl, splitted, owner, repo);
    config.developments.push({
      gitOrigin: `git@github.com:${owner}/${repo}.git`,
      name: repo,
      owner,
      resource: "github.com",
    });
  }
  return config;
}

/**
 *
 */
export function loadEmpty() {
  instance = {
    deployments: [],
    developments: [],
  };
}

/**
 *
 * @param configPath
 */
export function readConfigFile(configPath: string) {
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

/**
 * Loads and validates config
 * @param {string} workfolderPath path to work folder
 * @param {AncaWorkfolder} configContents paths to config files
 */
export function loadAndValidateConfig(
  workfolderPath: string,
  configContents: AncaWorkfolder,
) {
  verifyAjv(ANCA_WORKFOLDER_SCHEMA, configContents);

  instance = {
    deployments: [],
    developments: [],
  };

  for (const deployment of configContents.deployments) {
    const fullPath = path.resolve(
      workfolderPath,
      "deployments",
      deployment.code,
    );
    const deploymentInstance: AncaDeployment = {
      data: deployment,
      fullPath,
    };
    instance.deployments?.push(deploymentInstance);
  }

  for (const development of configContents.developments) {
    const folderPath = path.resolve(
      workfolderPath,
      "developments",
      development.resource,
      development.owner,
    );
    const fullPath = path.resolve(folderPath, development.name);
    const developmentInstance: AncaDevelopment = {
      data: development,
      folderPath,
      fullPath,
    };
    instance.developments?.push(developmentInstance);
    const monorepo = getMonorepo(fullPath);
    if (monorepo) {
      for (const part of monorepo) {
        const developmentInstancePart: AncaDevelopment = {
          data: development,
          folderPath: path.resolve(folderPath, part.name),
          fullPath: path.resolve(fullPath, part.name),
          monorepoFullPath: fullPath,
          monorepoPart: part.data,
        };
        instance.developments?.push(developmentInstancePart);
      }
    }
  }

  return instance;
}

/**
 *
 * @param config
 * @param currentPath
 */
async function traverseDirectory(config: AncaWorkfolder, currentPath: string) {
  const entries = await fs.promises.readdir(currentPath, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const entryPath = path.join(currentPath, entry.name);
      const parts = entryPath.split(path.sep);

      if (parts.length >= 4) {
        const resource = parts[parts.length - 3];
        const owner = parts[parts.length - 2];
        const repo = parts[parts.length - 1];

        config.developments.push({
          name: repo,
          owner,
          resource,
        });
      } else {
        await traverseDirectory(config, entryPath);
      }
    }
  }
}

/**
 *
 * @param workfolderPath
 */
export async function loadWorkfolder(workfolderPath: string) {
  const config: AncaWorkfolder = {
    ancaDataVersion: 0,
    deployments: [],
    developments: [],
  };

  await traverseDirectory(config, workfolderPath);
}

/**
 *
 * @param projectPaths
 */
export async function loadProjects(projectPaths: string[]) {
  instance = {
    deployments: [],
    developments: [],
  };

  for (const projectPath of projectPaths) {
    const fullPath = path.resolve(projectPath);
    const developmentInstance: AncaDevelopment = {
      fullPath,
    };
    instance.developments?.push(developmentInstance);
    const monorepo = getMonorepo(fullPath);
    if (monorepo) {
      for (const part of monorepo) {
        const developmentInstancePart: AncaDevelopment = {
          fullPath: path.resolve(fullPath, part.name),
          monorepoFullPath: fullPath,
          monorepoPart: part.data,
        };
        instance.developments?.push(developmentInstancePart);
      }
    }
  }

  return instance;
}

/**
 * Creates folders in the workfolder
 * @param workfolderPath
 */
export async function createFolders(workfolderPath: string) {
  const deploymentsPath = path.resolve(workfolderPath, "deployments");
  if (!(await checkExistence(deploymentsPath))) {
    await fs.promises.mkdir(deploymentsPath, { recursive: true });
  }

  const developments = getInstance().developments;

  if (!developments) {
    return;
  }

  for (const development of developments) {
    if (
      development.folderPath &&
      !(await checkExistence(development.folderPath))
    ) {
      await fs.promises.mkdir(development.folderPath, { recursive: true });
    }
  }
}
