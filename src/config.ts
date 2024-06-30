import Ajv from "ajv";
import fs from "fs";
import path from "path";

import {
  ANCA_WORKFOLDER_SCHEMA,
  AncaDeploymentState,
  AncaDevelopmentState,
  AncaState,
  AncaWorkfolder,
} from "./schema.js";
import { checkExistence } from "./utils.js";

let state: AncaState;

/**
 * Gets current Anca state
 * @returns Anca state
 */
export function getState(): AncaState {
  return state;
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
  const config: AncaWorkfolder = JSON.parse(
    fs.readFileSync(configsPath[0], "utf-8"),
  );

  const ajv = new Ajv();
  const validate = ajv.compile(ANCA_WORKFOLDER_SCHEMA);

  if (!validate(config)) {
    throw new Error(
      `Configuration validation error: ${validate.errors?.map((err) => err.message).join(", ")}`,
    );
  }

  state = {
    deployments: [],
    developments: [],
  };

  for (const deployment of config.deployments) {
    const fullPath = path.resolve(
      workfolderPath,
      "deployments",
      deployment.code,
    );
    const deploymentState: AncaDeploymentState = {
      data: deployment,
      fullPath,
    };
    state.deployments.push(deploymentState);
  }

  for (const development of config.developments) {
    const folderPath = path.resolve(
      workfolderPath,
      "developments",
      development.folder,
    );
    const fullPath = path.resolve(folderPath, development.name);
    const developmentState: AncaDevelopmentState = {
      data: development,
      folderPath,
      fullPath,
    };
    state.developments.push(developmentState);
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

  for (const development of getState().developments) {
    if (!(await checkExistence(development.folderPath))) {
      await fs.promises.mkdir(development.folderPath, { recursive: true });
    }
  }
}
