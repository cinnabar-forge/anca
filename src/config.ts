import fs from "fs";
import path from "path";

import {
  ANCA_WORKFOLDER_SCHEMA,
  Anca,
  AncaConfig,
  AncaDeployment,
  AncaDevelopment,
  AncaWorkfolder,
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
      folder: owner,
      gitOrigin: `https://github.com/${owner}/${repo}.git`,
      name: repo,
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
 * Loads and validates config
 * @param {string} workfolderPath path to work folder
 * @param {string[]} configsPath paths to config files
 */
export function loadAndValidateConfig(
  workfolderPath: string,
  configsPath: string[],
) {
  const configContents: AncaWorkfolder = JSON.parse(
    fs.readFileSync(configsPath[0], "utf-8"),
  );

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
    instance.deployments.push(deploymentInstance);
  }

  for (const development of configContents.developments) {
    const folderPath = path.resolve(
      workfolderPath,
      "developments",
      development.folder,
    );
    const fullPath = path.resolve(folderPath, development.name);
    const developmentInstance: AncaDevelopment = {
      data: development,
      folderPath,
      fullPath,
    };
    instance.developments.push(developmentInstance);
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
        instance.developments.push(developmentInstancePart);
      }
    }
  }
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
    instance.developments.push(developmentInstance);
    const monorepo = getMonorepo(fullPath);
    if (monorepo) {
      for (const part of monorepo) {
        const developmentInstancePart: AncaDevelopment = {
          fullPath: path.resolve(fullPath, part.name),
          monorepoFullPath: fullPath,
          monorepoPart: part.data,
        };
        instance.developments.push(developmentInstancePart);
      }
    }
  }
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

  for (const development of getInstance().developments) {
    if (
      development.folderPath &&
      !(await checkExistence(development.folderPath))
    ) {
      await fs.promises.mkdir(development.folderPath, { recursive: true });
    }
  }
}
