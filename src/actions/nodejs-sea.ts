import { AncaDevelopment, AncaNodejsSeaModules } from "../schema.js";
import {
  stringifyJson,
  writeFolderFile,
  writeFolderJsonFile,
} from "../utils.js";

const CONFIG = {
  disableExperimentalSEAWarning: true,
  main: "build/sea/index.cjs",
  output: "build/sea/prep.blob",
};

const BUILD_FILE_PATH = "sea.build.js";
const CONFIG_FILE_PATH = "sea.config.json";

/**
 * Get the contents of the build file
 *
 * N.B. --sentinel-fuse value is the base64 encoded value because Node SEA can't build with the raw value
 * @param seaModules
 */
function getBuildContents(seaModules?: AncaNodejsSeaModules) {
  const injection = seaModules?.sqlite3
    ? `
const injectSeaApi = function () {
  const bundleContent = fs.readFileSync(BUNDLE_FILE, "utf8");

  const bundleContentInjected = bundleContent
    .replace(
      \`"use strict";\`,
      \`"use strict";\\nvar cfSeaApi = require("node:sea"); // injected by Cinnabar Forge\\n\`
    )
    .replace(
      \`var binary = getBinarySync(file)\`,
      \`var binary = cfSeaApi.getAsset("node-sqlite3-wasm.wasm")\`,
    );

  fs.writeFileSync(BUNDLE_FILE, bundleContentInjected);
};
`
    : "";

  return `import { execSync } from "child_process";
import { build } from "esbuild";
import fs from "fs";
import path from "path";

const ESBUILD_NAME = "Node SEA Bundle";
const BUILD_DIR = path.join(import.meta.dirname, "build", "sea");
const BUNDLE_FILE = path.join(BUILD_DIR, "index.cjs");
${injection}
const buildCrossPlatform = function () {
  const isWindows = process.platform === "win32";

  const configCommand = "node --experimental-sea-config sea.config.json";
  execSync(configCommand, { stdio: "inherit" });

  const nodeBinaryPath = process.execPath;
  const baseName = "app";
  const destinationPath = path.join(BUILD_DIR, isWindows ? \`\${baseName}.exe\` : baseName);
  fs.copyFileSync(nodeBinaryPath, destinationPath);

  const postjectCommandBase = \`npx postject \${destinationPath} NODE_SEA_BLOB \${path.join(BUILD_DIR, "prep.blob")} --sentinel-fuse ${Buffer.from("Tk9ERV9TRUFfRlVTRV9mY2U2ODBhYjJjYzQ2N2I2ZTA3MmI4YjVkZjE5OTZiMg==", "base64").toString("ascii")}\`;
  const postjectCommand = isWindows
    ? postjectCommandBase.replace(/\\//g, "\\")
    : postjectCommandBase;
  execSync(postjectCommand, { stdio: "inherit" });
};

build({
  bundle: true,
  entryPoints: ["src/index.ts"],
  external: [],
  outfile: BUNDLE_FILE,
  platform: "node",
})
  .then((r) => {
    console.log(\`\${ESBUILD_NAME} has been built to \${BUNDLE_FILE}\`);
    ${seaModules?.sqlite3 ? "injectSeaApi();\n" : ""}buildCrossPlatform();
  })
  .catch((e) => {
    console.log(\`Error building \${ESBUILD_NAME}: \${e.message}\`);
    process.exit(1);
  });
`;
}

/**
 *
 * @param development
 */
export async function checkNodejsSeaBuildJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[BUILD_FILE_PATH];
  if (contents == null) {
    return false;
  }

  return (
    contents ===
    getBuildContents(development.state.config.development?.nodejsSeaModules)
  );
}

/**
 *
 * @param development
 */
export async function checkNodejsSeaConfigJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[CONFIG_FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === stringifyJson(CONFIG);
}

/**
 *
 * @param development
 */
export async function fixNodejsSeaBuildJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    BUILD_FILE_PATH,
    getBuildContents(development.state.config.development?.nodejsSeaModules),
  );
}

/**
 *
 * @param development
 */
export async function fixNodejsSeaConfigJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderJsonFile(development.fullPath, CONFIG_FILE_PATH, CONFIG);
}
