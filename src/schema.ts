export interface AncaDeploymentWorkfolderData {
  code: string;
  gitOrigin?: string;
}

export interface AncaDeployment {
  data: AncaDeploymentWorkfolderData;
  fullPath: string;
}

export interface AncaDevelopmentWorkfolderData {
  folder: string;
  gitOrigin?: string;
  gitProds?: string[];
  name: string;
}

export interface AncaDevelopmentState {
  actions: string[];
  config: AncaConfig;
  files: Record<string, null | string | undefined>;
  issues: string[];
  jsonFiles: Record<string, null | object | undefined>;
}

export interface AncaDevelopment {
  data: AncaDevelopmentWorkfolderData;
  folderPath: string;
  fullPath: string;
  state?: AncaDevelopmentState;
}

export interface Anca {
  deployments: AncaDeployment[];
  developments: AncaDevelopment[];
}

export interface AncaWorkfolder {
  ancaDataVersion: 0;
  deployments: AncaDeploymentWorkfolderData[];
  developments: AncaDevelopmentWorkfolderData[];
}

export enum AncaConfigStack {
  nodejs = "nodejs",
  python = "python",
  unsupported = "unsupported",
}

export enum AncaConfigType {
  app = "app",
  library = "library",
  project = "project",
}

export interface AncaConfig {
  deployment?: DeploymentConfig;
  development?: DevelopmentConfig;
  stack?: AncaConfigStack;
  type?: AncaConfigType;
}

export interface DeploymentConfig {
  preparation: string[];
  start: string[];
}

export interface DevelopmentConfig {
  cinnabarMeta?: boolean;
  gitIgnore?: string; // Consider replacing 'string' with a specific type if there are a limited set of possible values.
  license?: boolean;
  nodejs?: string; // Consider replacing 'string' with a specific type if there are a limited set of possible values.
  nodejsEslint?: string; // Consider replacing 'string' with a specific type if there are a limited set of possible values.
  nodejsPrettier?: string; // Consider replacing 'string' with a specific type if there are a limited set of possible values.
  readme?: string; // Consider replacing 'string' with a specific type if there are a limited set of possible values.
}

export const ANCA_WORKFOLDER_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  properties: {
    ancaDataVersion: {
      description: "Data version number, used to control schema changes",
      type: "integer",
    },
    deployments: {
      description: "List of deployment projects",
      items: {
        properties: {
          code: {
            type: "string",
          },
        },
        required: ["code"],
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
  title: "Anca Workfolder",
  type: "object",
};

export const ANCA_CONFIG_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  additionalProperties: false,
  properties: {
    deployment: {
      properties: {
        preparation: {
          items: {
            type: "string",
          },
          type: "array",
        },
        start: {
          items: {
            type: "string",
          },
          type: "array",
        },
      },
      required: ["preparation", "start"],
      type: "object",
    },
    development: {
      additionalProperties: false,
      properties: {
        cinnabarMeta: { type: "boolean" },
        gitIgnore: { type: "string" },
        license: { type: "boolean" },
        nodejs: { type: "string" },
        nodejsEslint: { type: "string" },
        nodejsPrettier: { type: "string" },
        readme: { type: "string" },
      },
      type: "object",
    },
    stack: {
      enum: ["nodejs", "python", "unsupported"],
      type: "string",
    },
    type: {
      enum: ["app", "library", "project"],
      type: "string",
    },
  },
  required: ["stack", "type"],
  type: "object",
};
