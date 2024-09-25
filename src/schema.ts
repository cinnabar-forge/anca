export interface AncaDeploymentWorkfolderData {
  code: string;
  gitOrigin?: string;
}

export interface AncaDeployment {
  data: AncaDeploymentWorkfolderData;
  fullPath: string;
}

export interface AncaDevelopmentWorkfolderData {
  gitOrigin?: string;
  gitProds?: string[];
  name: string;
  owner: string;
  resource: string;
}

export type AncaAction =
  | "ancaJsonFix"
  | "contributingSetToDefault"
  | "devcontainerDockerfileSetToDefault"
  | "devcontainerJsonSetToDefault"
  | "gitClone"
  | "githubActionsOtherFilesRemove"
  | "githubActionsReleaseSetToDefault"
  | "githubActionsTestSetToDefault"
  | "gitIgnoreSetToDefault"
  | "licenseSetToDefault"
  | "nodejsEsbuildSetToDefault"
  | "nodejsEslintSetToDefault"
  | "nodejsOpenapiSetToDefault"
  | "nodejsPackageJsonCheckUpdates"
  | "nodejsPackageJsonFix"
  | "nodejsPackageJsonFixFull"
  | "nodejsPrettierIgnoreSetToDefault"
  | "nodejsPrettierRcSetToDefault"
  | "nodejsSeaBuildJsSetToDefault"
  | "nodejsSeaConfigJsonSetToDefault"
  | "nodejsSrcSetToDefault"
  | "nodejsTestSetToDefault"
  | "nodejsTsconfigSetToDefault"
  | "nodejsTsupConfigJsSetToDefault"
  | "openapiJsonSetToDefault"
  | "readmeSetToDefault";

export const ANCA_ACTIONS: AncaAction[] = [
  "ancaJsonFix",
  "contributingSetToDefault",
  "devcontainerDockerfileSetToDefault",
  "devcontainerJsonSetToDefault",
  "gitClone",
  "githubActionsOtherFilesRemove",
  "githubActionsReleaseSetToDefault",
  "githubActionsTestSetToDefault",
  "gitIgnoreSetToDefault",
  "licenseSetToDefault",
  "nodejsEsbuildSetToDefault",
  "nodejsEslintSetToDefault",
  "nodejsOpenapiSetToDefault",
  "nodejsPackageJsonCheckUpdates",
  "nodejsPackageJsonFix",
  "nodejsPackageJsonFixFull",
  "nodejsPrettierIgnoreSetToDefault",
  "nodejsPrettierRcSetToDefault",
  "nodejsSeaBuildJsSetToDefault",
  "nodejsSeaConfigJsonSetToDefault",
  "nodejsSrcSetToDefault",
  "nodejsTestSetToDefault",
  "nodejsTsconfigSetToDefault",
  "nodejsTsupConfigJsSetToDefault",
  "openapiJsonSetToDefault",
  "readmeSetToDefault",
];

export interface AncaMeta {
  description?: string;
  name?: string;
  version?: { isPrerelease?: boolean; isUnstable?: boolean; text: string };
}

export interface AncaDevelopmentState {
  actions: AncaAction[];
  config: AncaConfig;
  files: Record<string, null | string | undefined>;
  issues: AncaAction[];
  jsonFiles: Record<string, null | object | undefined>;
  meta?: AncaMeta;
}

export interface AncaDevelopment {
  data?: AncaDevelopmentWorkfolderData;
  folderPath?: string;
  fullPath: string;
  monorepoFullPath?: string;
  monorepoPart?: AncaConfigMonorepoData;
  state?: AncaDevelopmentState;
}

export interface Anca {
  deployments?: AncaDeployment[];
  developments?: AncaDevelopment[];
}

export interface AncaWorkfolder {
  ancaDataVersion: 0;
  deployments: AncaDeploymentWorkfolderData[];
  developments: AncaDevelopmentWorkfolderData[];
}

export enum AncaConfigStack {
  nodejs = "nodejs",
  unsupported = "unsupported",
}

export enum AncaConfigType {
  api = "api",
  app = "app",
  dts = "dts",
  library = "library",
  project = "project",
  web = "web",
}

export interface AncaConfigAuthor {
  email?: string;
  github?: string;
  name: string;
  status?: "active" | "inactive" | "retired";
  text?: string;
  type?: "author" | "contributor" | "maintainer" | "special";
  url?: string;
}

export interface AncaConfigOrganization {
  name: string;
  text?: string;
  url?: string;
}

export interface AncaConfigNamings {
  bin?: string;
  npmPackage?: string;
  text: string;
  textLong?: string;
  textShort?: string;
}

export interface AncaConfigMonorepoData {
  development?: AncaDevelopmentConfig;
  namings?: AncaConfigNamings;
  stack?: AncaConfigStack;
  type?: AncaConfigType;
}

export interface AncaConfigMonorepo {
  data: AncaConfigMonorepoData;
  name: string;
}

export interface AncaConfig {
  authors?: AncaConfigAuthor[];
  cinnabarMeta?: any;
  deployment?: AncaDeploymentConfig;
  development?: AncaDevelopmentConfig;
  downloadBinariesUrl?: string;
  monorepo?: AncaConfigMonorepo[];
  namings?: AncaConfigNamings;
  organizations?: AncaConfigOrganization[];
  public?: boolean;
  stack?: AncaConfigStack;
  type?: AncaConfigType;
}

export interface AncaDeploymentConfig {
  preparation: string[];
  start: string[];
}

export interface AncaNodejsSeaModules {
  sqlite3?: boolean;
}

export interface AncaNodejsOpenapi {
  externalModule?: boolean;
  modelsLocation?: string;
  modelsLocationType?: "file" | "folder";
  modelsModule?: string;
}

export interface AncaReadmeUsageSection {
  code?: string[];
  description?: string;
  language?: string;
  name?: string;
  sections?: AncaReadmeUsageSection[];
}

export interface AncaReadme {
  description?: string[];
  features?: string[];
  usage?: AncaReadmeUsageSection[];
}

export interface AncaDevelopmentConfig {
  nodejsOpenapi?: AncaNodejsOpenapi;
  nodejsSeaModules?: AncaNodejsSeaModules;
  readme?: AncaReadme;
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
          gitOrigin: {
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
          owner: {
            type: "string",
          },
          resource: {
            type: "string",
          },
        },
        required: ["resource", "owner", "name"],
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
  definitions: {
    author: {
      properties: {
        email: { type: "string" },
        github: { type: "string" },
        name: { type: "string" },
        status: { enum: ["active", "inactive", "retired"], type: "string" },
        text: { type: "string" },
        type: {
          enum: ["author", "contributor", "maintainer", "special"],
          type: "string",
        },
        url: { type: "string" },
      },
      required: ["name"],
      type: "object",
    },
    usageItem: {
      properties: {
        code: {
          items: {
            type: "string",
          },
          type: "array",
        },
        description: { type: "string" },
        language: { type: "string" },
        name: { type: "string" },
        sections: {
          items: {
            $ref: "#/definitions/usageItem",
          },
          type: "array",
        },
      },
      type: "object",
    },
  },
  properties: {
    authors: {
      items: {
        $ref: "#/definitions/author",
      },
      type: "array",
    },
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
      type: "object",
    },
    development: {
      properties: {
        nodejsOpenapi: {
          properties: {
            externalModule: { type: "boolean" },
            modelsLocation: { type: "string" },
            modelsLocationType: { enum: ["file", "folder"], type: "string" },
            modelsModule: { type: "string" },
          },
          type: "object",
        },
        nodejsSeaModules: {
          properties: {
            sqlite3: { type: "boolean" },
          },
          type: "object",
        },
        readme: {
          properties: {
            description: {
              items: {
                type: "string",
              },
              type: "array",
            },
            features: {
              items: {
                type: "string",
              },
              type: "array",
            },
            usage: {
              items: {
                $ref: "#/definitions/usageItem",
              },
              type: "array",
            },
          },
          type: "object",
        },
      },
      type: "object",
    },
    downloadBinariesUrl: {
      type: "string",
    },
    monorepo: {
      items: {
        properties: {
          data: {
            properties: {
              development: {
                $ref: "#/properties/development",
              },
              namings: {
                $ref: "#/properties/namings",
              },
              stack: {
                enum: ["nodejs", "unsupported"],
                type: "string",
              },
              type: {
                enum: ["api", "app", "dts", "library", "project", "web"],
                type: "string",
              },
            },
            type: "object",
          },
          name: { type: "string" },
        },
        required: ["data", "name"],
        type: "object",
      },
      type: "array",
    },
    namings: {
      properties: {
        bin: { type: "string" },
        npmPackage: { type: "string" },
        text: { type: "string" },
        textLong: { type: "string" },
        textShort: { type: "string" },
      },
      required: ["text"],
      type: "object",
    },
    organizations: {
      items: {
        properties: {
          name: { type: "string" },
          text: { type: "string" },
          url: { type: "string" },
        },
        required: ["name"],
        type: "object",
      },
      type: "array",
    },
    public: {
      type: "boolean",
    },
    stack: {
      enum: ["nodejs", "unsupported"],
      type: "string",
    },
    type: {
      enum: ["api", "app", "dts", "library", "project", "web"],
      type: "string",
    },
  },
  required: ["namings"],
  type: "object",
};
