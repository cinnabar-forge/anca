import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const TSUP = `import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  splitting: false,
});
`;

const FILE_PATH = "tsup.config.js";

/**
 *
 * @param development
 */
export async function checkNodejsTsupConfigJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === TSUP;
}

/**
 *
 * @param development
 */
export async function fixNodejsTsupConfigJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(development.fullPath, FILE_PATH, TSUP);
}
