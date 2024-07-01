import { execSync } from "child_process";
import { build } from "esbuild";
import fs from "fs";
import path from "path";

const ESBUILD_NAME = "Node SEA Bundle";
const OUT_FILE = "build/sea/index.cjs";

const buildCrossPlatform = function () {
  const buildDir = path.join(import.meta.dirname, "build", "sea");

  const isWindows = process.platform === "win32";

  const configCommand = "node --experimental-sea-config sea.config.json";
  execSync(configCommand, { stdio: "inherit" });

  const nodeBinaryPath = process.execPath;
  const destinationPath = path.join(buildDir, isWindows ? "anca.exe" : "anca");
  fs.copyFileSync(nodeBinaryPath, destinationPath);

  const postjectCommandBase = `npx postject ${destinationPath} NODE_SEA_BLOB ${path.join(buildDir, "prep.blob")} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;
  const postjectCommand = isWindows
    ? postjectCommandBase.replace(/\//g, "\\")
    : postjectCommandBase;
  execSync(postjectCommand, { stdio: "inherit" });
};

build({
  bundle: true,
  entryPoints: ["src/index.ts"],
  external: [],
  outfile: OUT_FILE,
  platform: "node",
})
  .then((r) => {
    console.log(`${ESBUILD_NAME} has been built to ${OUT_FILE}`);
    buildCrossPlatform();
  })
  .catch((e) => {
    console.log(`Error building ${ESBUILD_NAME}: ${e.message}`);
    process.exit(1);
  });
