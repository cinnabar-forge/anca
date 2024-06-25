import { build } from "esbuild";

const ESBUILD_NAME = "Node SEA Bundle";
const OUT_FILE = "build/sea/index.cjs";

build({
  bundle: true,
  entryPoints: ["src/index.ts"],
  external: [],
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
