import { AncaDevelopment } from "../schema.js";
import { writeFolderFile, writeFolderJsonFile } from "../utils.js";

const RC_FILE_PATH = ".prettierrc";
const IGNORE_FILE_PATH = ".prettierignore";

/**
 *
 * @param development
 */
export async function checkNodejsPrettierRc(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.jsonFiles[RC_FILE_PATH];
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
export async function checkNodejsPrettierIgnore(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[IGNORE_FILE_PATH];
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
export async function fixNodejsPrettierRc(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderJsonFile(
    development.fullPath,
    RC_FILE_PATH,
    development.state.jsonFiles[RC_FILE_PATH],
  );
}

/**
 *
 * @param development
 */
export async function fixNodejsPrettierIgnore(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    IGNORE_FILE_PATH,
    development.state.files[IGNORE_FILE_PATH],
  );
}
