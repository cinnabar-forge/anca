import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const FILE_PATH = "eslint.config.js";

/**
 *
 * @param development
 */
export async function checkNodejsEslintConfigJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  if (contents == null) {
    return false;
  }
  contents;
  return true;
}

/**
 *
 * @param development
 */
export async function fixNodejsEslintConfigJs(development: AncaDevelopment) {
  if (development.state == null || development.state.files[FILE_PATH] == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    FILE_PATH,
    development.state.files[FILE_PATH],
  );
}
