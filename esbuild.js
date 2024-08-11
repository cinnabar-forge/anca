import { build } from "esbuild";
import fs from "fs";
import path from "path";

const getNodeModules = () => {
  const nodeModulesPath = path.resolve(import.meta.dirname, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    return [];
  }

  return fs.readdirSync(nodeModulesPath).filter((module) => {
    return !module.startsWith(".");
  });
};

const IS_NPM_BUNDLE = process.argv[2] !== "full";

const ESBUILD_NAME = IS_NPM_BUNDLE ? "NPM Bundle" : "Full Bundle";
const OUT_FILE = IS_NPM_BUNDLE ? "dist/index.js" : "build/bundle/index.js";

const nodeModules = IS_NPM_BUNDLE ? getNodeModules() : [];

build({
  bundle: true,
  entryPoints: ["src/index.ts"],
  external: nodeModules,
  format: IS_NPM_BUNDLE ? "esm" : "cjs",
  outfile: OUT_FILE,
  platform: "node",
})
  .then((r) => {
    console.log(`${ESBUILD_NAME} has been built to ${OUT_FILE}`);
  })
  .catch((e) => {
    console.log(`Error building ${ESBUILD_NAME}: ${e.message}`);
    process.exit(1);
  });
