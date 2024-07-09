import { AncaDevelopment } from "../schema.js";
import { writeFolderFile, writeFolderJsonFile } from "../utils.js";

const BUILD_FILE_PATH = "sea.build.js";
const CONFIG_FILE_PATH = "sea.config.json";

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
  contents;
  return true;
}

/**
 *
 * @param development
 */
export async function checkNodejsSeaConfigJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.jsonFiles[CONFIG_FILE_PATH];
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
export async function fixNodejsSeaBuildJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    BUILD_FILE_PATH,
    development.state.files[BUILD_FILE_PATH],
  );
}

/**
 *
 * @param development
 */
export async function writeNodejsSeaConfigJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderJsonFile(
    development.fullPath,
    CONFIG_FILE_PATH,
    development.state.jsonFiles[CONFIG_FILE_PATH],
  );
}
