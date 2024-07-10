import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const ESBUILD = `import { build } from "esbuild";
import fs from "fs";
import path from "path";

const getNodeModules = () => {
  const nodeModulesPath = path.resolve(import.meta.dirname, "node_modules");
  console.log(nodeModulesPath);
  if (!fs.existsSync(nodeModulesPath)) {
    return [];
  }

  return fs.readdirSync(nodeModulesPath).filter((module) => {
    return !module.startsWith(".");
  });
};

const ESBUILD_NAME = "NPM Bundle";
const OUT_FILE = "dist/index.js";

const nodeModules = getNodeModules();

build({
  bundle: true,
  entryPoints: ["src/index.ts"],
  external: nodeModules,
  format: "esm",
  outfile: OUT_FILE,
  platform: "node",
})
  .then((r) => {
    console.log(\`\${ESBUILD_NAME} has been built to \${OUT_FILE}\`);
  })
  .catch((e) => {
    console.log(\`Error building \${ESBUILD_NAME}: \${e.message}\`);
    process.exit(1);
  });`;

const FILE_PATH = "esbuild.js";

/**
 *
 * @param development
 */
export async function checkNodejsEsbuildJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === ESBUILD;
}

/**
 *
 * @param development
 */
export async function fixNodejsEsbuildJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(development.fullPath, FILE_PATH, ESBUILD);
}
