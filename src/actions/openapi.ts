import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const FILE_PATH = "openapi.json";

/**
 *
 * @param development
 */
function getContents(development: AncaDevelopment) {
  return `{"openapi": "3.0.0", "info": {"title": "${development.fullPath}", "version": "0.0.0"}}`;
}

/**
 *
 * @param development
 */
export async function checkOpenapiJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === getContents(development);
}

/**
 *
 * @param development
 */
export async function fixOpenapiJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    FILE_PATH,
    getContents(development),
  );
}
