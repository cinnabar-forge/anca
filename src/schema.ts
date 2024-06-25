export interface AncaDeployment {
  folder: string;
  gitOrigin?: string;
  name: string;
}

export interface AncaDeploymentState {
  data: AncaDeployment;
  folderPath?: string;
  fullPath?: string;
}

export interface AncaDevelopment {
  folder: string;
  gitOrigin?: string;
  gitProds?: string[];
  name: string;
}

export interface AncaDevelopmentState {
  convention?: string;
  data: AncaDevelopment;
  folderPath?: string;
  fullPath?: string;
  stack?: string;
}

export interface AncaConfig {
  ancaDataVersion: 0;
  deployments: AncaDeployment[];
  developments: AncaDevelopment[];
}

export interface AncaState {
  deployments: AncaDeploymentState[];
  developments: AncaDevelopmentState[];
}

export const ANCA_CONFIG_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  properties: {
    ancaDataVersion: {
      description: "Data version number, used to control schema changes",
      type: "integer",
    },
    deployments: {
      description: "List of deployment projects",
      items: {
        type: "object",
      },
      type: "array",
    },
    developments: {
      description: "List of development projects",
      items: {
        properties: {
          folder: {
            type: "string",
          },
          gitOrigin: {
            type: "string",
          },
          gitProds: {
            items: {
              type: "string",
            },
            type: "array",
          },
          mainBranch: {
            type: "string",
          },
          name: {
            type: "string",
          },
        },
        required: ["folder", "name"],
        type: "object",
      },
      type: "array",
    },
  },
  required: ["ancaDataVersion", "deployments", "developments"],
  title: "Anca Configuration",
  type: "object",
};
