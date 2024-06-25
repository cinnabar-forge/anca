import Ajv from "ajv";
import fs from "fs";
import path from "path";

import {
  ANCA_CONFIG_SCHEMA,
  AncaConfig,
  AncaDeploymentState,
  AncaDevelopmentState,
  AncaState,
} from "./schema.js";

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
  const config: AncaConfig = JSON.parse(
    fs.readFileSync(configsPath[0], "utf-8"),
  );

  const ajv = new Ajv();
  const validate = ajv.compile(ANCA_CONFIG_SCHEMA);

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
    const deploymentState: AncaDeploymentState = {
      data: deployment,
    };
    deploymentState.folderPath = path.resolve(
      workfolderPath,
      "deployments",
      deployment.folder,
    );
    deploymentState.fullPath = path.resolve(
      deploymentState.folderPath,
      deployment.name,
    );
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
