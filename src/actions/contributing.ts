import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const COMMON_PART = `# Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, feel free to open an issue or create a pull request.

## Installation

We support [Devcontainers](https://containers.dev/). You can use the provided development container to work on this project. The development container includes all the necessary tools and dependencies to work on this project.`;

const NODE_JS_PART = `Otherwise, download, install and configure [Node.js](https://nodejs.org/en/download/).

Then, run the following commands to install the dependencies and run the tests:

\`\`\`bash
npm ci
npm test
\`\`\``;

const FILE_PATH = "CONTRIBUTING.md";

/**
 *
 * @param development
 */
function getContents(development: AncaDevelopment) {
  if (development.state == null) {
    return "";
  }
  if (development.state.config.stack === "nodejs") {
    return `${COMMON_PART}\n\n${NODE_JS_PART}\n`;
  }
  return COMMON_PART + "\n";
}

/**
 *
 * @param development
 */
export async function checkContributingMd(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === getContents(development);
}

/**
 *
 * @param development
 */
export async function fixContributingMd(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    FILE_PATH,
    getContents(development),
  );
}
