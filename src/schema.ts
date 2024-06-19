export type AncaDeployment = {
  folder: string;
  name: string;
  gitOrigin?: string;
};

export type AncaDeploymentState = {
  data: AncaDeployment;
  folderPath?: string;
  fullPath?: string;
};

export type AncaDevelopment = {
  folder: string;
  name: string;
  gitOrigin?: string;
  gitProds?: string[];
};

export type AncaDevelopmentState = {
  data: AncaDevelopment;
  folderPath?: string;
  fullPath?: string;
  stack?: string;
  convention?: string;
};

export type AncaConfig = {
  ancaDataVersion: 0;
  deployments: Array<AncaDeployment>;
  developments: Array<AncaDevelopment>;
};

export type AncaState = {
  deployments: Array<AncaDeploymentState>;
  developments: Array<AncaDevelopmentState>;
};

export const ANCA_CONFIG_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Anca Configuration",
  type: "object",
  required: ["ancaDataVersion", "deployments", "developments"],
  properties: {
    ancaDataVersion: {
      description: "Data version number, used to control schema changes",
      type: "integer",
    },
    deployments: {
      description: "List of deployment projects",
      type: "array",
      items: {
        type: "object",
      },
    },
    developments: {
      description: "List of development projects",
      type: "array",
      items: {
        type: "object",
        required: ["folder", "name"],
        properties: {
          folder: {
            type: "string",
          },
          name: {
            type: "string",
          },
          gitOrigin: {
            type: "string",
          },
          gitProds: {
            type: "array",
            items: {
              type: "string",
            },
          },
          mainBranch: {
            type: "string",
          },
        },
      },
    },
  },
};
