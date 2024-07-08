import fs from "fs";
import path from "path";

import { AncaDevelopment, AncaDevelopmentState } from "../schema.js";
import { isSubset } from "../utils.js";

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

const DOCKERFILE_NODEJS = `FROM docker.io/node:22.4.0

USER node
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DOCKERFILE_NODEJS_INSTALL = `# Install Node.js
ENV NODE_VERSION 22.3.0
ENV NODE_CHECKSUM sha256:a6d4fbf4306a883b8e1d235a8a890be84b9d95d2d39b929520bed64da41ce540
ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v\${NODE_VERSION}/node-v\${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar -xz -f /node.tar.gz -C /usr/local --remove-files --strip-components=1
`;

/**
 *
 * @param state
 * @param contents
 */
export function checkDevcontainerJson(
  state: AncaDevelopmentState,
  contents: object,
) {
  return isSubset(
    contents,
    state.config.stack === "nodejs" ? JSON_NODEJS : JSON_FALLBACK,
  );
}

/**
 *
 * @param state
 * @param contents
 */
export function checkDevcontainerDockerfile(
  state: AncaDevelopmentState,
  contents: string,
) {
  return (
    contents ===
    (state.config.stack === "nodejs" ? DOCKERFILE_NODEJS : DOCKERFILE_FALLBACK)
  );
}

/**
 *
 * @param development
 * @param state
 */
export async function fixDevcontainerJson(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
) {
  await fs.promises.mkdir(path.join(development.fullPath, ".devcontainer"), {
    recursive: true,
  });
  const json = state.config.stack === "nodejs" ? JSON_NODEJS : JSON_FALLBACK;
  fs.writeFileSync(
    path.join(development.fullPath, ".devcontainer/devcontainer.json"),
    JSON.stringify(json, null, 2),
  );
}

/**
 *
 * @param development
 * @param state
 */
export async function fixDevcontainerDockerfile(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
) {
  await fs.promises.mkdir(path.join(development.fullPath, ".devcontainer"), {
    recursive: true,
  });
  const dockerfile =
    state.config.stack === "nodejs" ? DOCKERFILE_NODEJS : DOCKERFILE_FALLBACK;
  fs.writeFileSync(
    path.join(development.fullPath, ".devcontainer/Dockerfile"),
    dockerfile,
  );
}
