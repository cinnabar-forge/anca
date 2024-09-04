import { build, context } from "esbuild";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const getNodeModules = () => {
  const nodeModulesPath = path.resolve(import.meta.dirname, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    return [];
  }

  return fs.readdirSync(nodeModulesPath).filter((module) => {
    return !module.startsWith(".");
  });
};

const IS_WATCH_MODE = process.argv[2] === "watch";
const IS_NPM_BUNDLE = process.argv[2] !== "full";
const ARGUMENTS = process.argv[3] || "";

const ESBUILD_NAME = IS_NPM_BUNDLE ? "NPM Bundle" : "Full Bundle";
const OUT_FILE = IS_NPM_BUNDLE ? "dist/index.js" : "build/bundle/index.js";

const nodeModules = IS_NPM_BUNDLE ? getNodeModules() : [];

const buildOptions = {
  bundle: true,
  entryPoints: ["src/index.ts"],
  external: nodeModules,
  format: IS_NPM_BUNDLE ? "esm" : "cjs",
  outfile: OUT_FILE,
  platform: "node",
};

let childProcess = null;

const runOutputFile = () => {
  if (childProcess) {
    childProcess.kill();
  }
  childProcess = spawn("node", [OUT_FILE, ...ARGUMENTS.split(" ")], {
    stdio: "inherit",
  });
};

const cleanUp = () => {
  if (childProcess) {
    childProcess.kill();
  }
  process.exit();
};

const watchOutputFile = () => {
  fs.watch(OUT_FILE, (eventType) => {
    if (eventType === "change") {
      runOutputFile();
    }
  });
};

process.on("exit", cleanUp);
process.on("SIGINT", cleanUp);
process.on("SIGTERM", cleanUp);
process.on("uncaughtException", cleanUp);

if (IS_WATCH_MODE) {
  context(buildOptions)
    .then(async (ctx) => {
      await ctx.watch();
      console.log(
        `Watching ${buildOptions.entryPoints[0]}... (out: ${ESBUILD_NAME} '${OUT_FILE}')`,
      );
      runOutputFile();
      watchOutputFile();
    })
    .catch((e) => {
      console.error(
        `Error setting up watch mode for ${ESBUILD_NAME}: ${e.message}`,
      );
      process.exit(1);
    });
} else {
  build(buildOptions)
    .then(() => {
      console.log(`${ESBUILD_NAME} has been built to ${OUT_FILE}`);
    })
    .catch((e) => {
      console.error(`Error building ${ESBUILD_NAME}: ${e.message}`);
      process.exit(1);
    });
}
