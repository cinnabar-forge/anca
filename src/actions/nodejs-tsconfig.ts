import { AncaDevelopment } from "../schema.js";
import { writeFolderJsonFile } from "../utils.js";

const FILE_PATH = "tsconfig.json";

/**
 *
 * @param development
 */
export async function checkNodejsTsconfigJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.jsonFiles[FILE_PATH];
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
export async function fixNodejsTsconfigJson(development: AncaDevelopment) {
  if (
    development.state == null ||
    development.state.jsonFiles[FILE_PATH] == null
  ) {
    return;
  }
  await writeFolderJsonFile(
    development.fullPath,
    FILE_PATH,
    development.state.jsonFiles[FILE_PATH],
  );
}
