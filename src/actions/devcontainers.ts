import fs from "fs";
import path from "path";

import { AncaDevelopment } from "../schema.js";
import { stringifyJson, writeFolderJsonFile } from "../utils.js";
import { NODEJS_22_VERSION, NODEJS_22_VERSION_SHA } from "./variables.js";

const JSON_FALLBACK = {
  build: {
    context: ".",
    dockerfile: "./Dockerfile",
  },
  customizations: {
    vscode: {
      extensions: [],
    },
  },
};

const DOCKERFILE_FALLBACK = `FROM docker.io/debian:12

# Install dependencies
RUN apt-get update \
  && apt-get install -y git \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/bash developer
USER developer
`;

const JSON_NODEJS = {
  build: {
    context: ".",
    dockerfile: "./Dockerfile",
  },
  customizations: {
    vscode: {
      extensions: [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "streetsidesoftware.code-spell-checker",
      ],
    },
  },
  name: "Node.js 22",
};

const DOCKERFILE_NODEJS = `FROM docker.io/node:${NODEJS_22_VERSION}

USER node
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DOCKERFILE_NODEJS_INSTALL = `# Install Node.js
ENV NODE_VERSION ${NODEJS_22_VERSION}
ENV NODE_CHECKSUM sha256:${NODEJS_22_VERSION_SHA}
ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v\${NODE_VERSION}/node-v\${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar -xz -f /node.tar.gz -C /usr/local --remove-files --strip-components=1
`;

const DEVCONTAINER_JSON_FILE_PATH = ".devcontainer/devcontainer.json";
const DOCKERFILE_FILE_PATH = ".devcontainer/Dockerfile";

/**
 *
 * @param development
 */
export async function checkDevcontainerJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[DEVCONTAINER_JSON_FILE_PATH];
  if (contents == null) {
    return false;
  }
  return (
    contents ===
    stringifyJson(
      development.state.config.stack === "nodejs" ? JSON_NODEJS : JSON_FALLBACK,
    )
  );
}

/**
 *
 * @param development
 */
export async function checkDevcontainerDockerfile(
  development: AncaDevelopment,
) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[DOCKERFILE_FILE_PATH];
  if (contents == null) {
    return false;
  }
  return (
    contents ===
    (development.state.config.stack === "nodejs"
      ? DOCKERFILE_NODEJS
      : DOCKERFILE_FALLBACK)
  );
}

/**
 *
 * @param development
 */
export async function fixDevcontainerJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await fs.promises.mkdir(path.join(development.fullPath, ".devcontainer"), {
    recursive: true,
  });
  const json =
    development.state.config.stack === "nodejs" ? JSON_NODEJS : JSON_FALLBACK;
  writeFolderJsonFile(
    development.fullPath,
    ".devcontainer/devcontainer.json",
    json,
  );
}

/**
 *
 * @param development
 */
export async function fixDevcontainerDockerfile(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await fs.promises.mkdir(path.join(development.fullPath, ".devcontainer"), {
    recursive: true,
  });
  const dockerfile =
    development.state.config.stack === "nodejs"
      ? DOCKERFILE_NODEJS
      : DOCKERFILE_FALLBACK;
  fs.writeFileSync(
    path.join(development.fullPath, ".devcontainer/Dockerfile"),
    dockerfile,
  );
}
