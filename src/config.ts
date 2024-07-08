import fs from "fs";
import path from "path";

import {
  ANCA_WORKFOLDER_SCHEMA,
  Anca,
  AncaDeployment,
  AncaDevelopment,
  AncaWorkfolder,
} from "./schema.js";
import { checkExistence, verifyAjv } from "./utils.js";

let instance: Anca;

/**
 * Gets current Anca instance
 * @returns Anca instance
 */
export function getInstance(): Anca {
  return instance;
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
    if (!(await checkExistence(development.folderPath))) {
      await fs.promises.mkdir(development.folderPath, { recursive: true });
    }
  }
}
