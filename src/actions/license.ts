import type { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const FILE_PATH = "LICENSE";

/**
 *
 * @param development
 */
export async function checkLicenseMd(development: AncaDevelopment) {
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
export async function fixLicenseMd(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    FILE_PATH,
    development.state.files[FILE_PATH] || "There is nothing we can do",
  );
}
