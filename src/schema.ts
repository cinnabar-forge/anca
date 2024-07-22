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

export type AncaAction =
  | "ancaJsonFix"
  | "contributingSetToDefault"
  | "devcontainerDockerfileSetToDefault"
  | "devcontainerJsonSetToDefault"
  | "gitClone"
  | "gitIgnoreSetToDefault"
  | "githubActionsOtherFilesRemove"
  | "githubActionsReleaseSetToDefault"
  | "githubActionsTestSetToDefault"
  | "licenseSetToDefault"
  | "nodejsEsbuildSetToDefault"
  | "nodejsEslintSetToDefault"
  | "nodejsPackageJsonCheckUpdates"
  | "nodejsPackageJsonFix"
  | "nodejsPrettierIgnoreSetToDefault"
  | "nodejsPrettierRcSetToDefault"
  | "nodejsSeaBuildJsSetToDefault"
  | "nodejsSeaConfigJsonSetToDefault"
  | "nodejsTsconfigSetToDefault"
  | "nodejsTsupConfigJsSetToDefault"
  | "readmeSetToDefault";

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

export interface AncaConfigAuthor {
  email?: string;
  github?: string;
  name: string;
  text?: string;
  type?: "contributor" | "maintainer" | "special";
  url?: string;
}

export interface AncaConfigOrganization {
  name: string;
  text?: string;
  url?: string;
}

export interface AncaConfig {
  authors?: AncaConfigAuthor[];
  deployment?: AncaDeploymentConfig;
  development?: AncaDevelopmentConfig;
  downloadBinariesUrl?: string;
  organizations?: AncaConfigOrganization[];
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
  definitions: {
    author: {
      properties: {
        email: { type: "string" },
        github: { type: "string" },
        name: { type: "string" },
        text: { type: "string" },
        type: {
          enum: ["contributor", "maintainer", "special"],
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
    stack: {
      enum: ["nodejs", "unsupported"],
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

/**
 * Format the author line for the Markdown file
 * @param author
 */
export function formatAuthorLine(author: AncaConfigAuthor): string {
  let authorLine = `- ${author.name}`;
  if (author.github) {
    authorLine += ` ([@${author.github}](https://github.com/${author.github}))`;
  } else if (author.url) {
    authorLine += ` — <${author.url}>`;
  } else if (author.email) {
    authorLine += ` — <${author.email}>`;
  }
  if (author.text) {
    authorLine += ` — ${author.text}`;
  }
  return authorLine;
}
