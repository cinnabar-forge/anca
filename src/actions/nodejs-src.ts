import fs from "fs";
import path from "path";

import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const SRC_FILE_PATH = "./src/index.ts";
const TEST_FILE_PATH = "./test/index.test.ts";

/**
 *
 * @param development
 */
function getSrcContents(development: AncaDevelopment) {
  return `console.log("Hello, Anca!"); // ${development.fullPath}\n`;
}

/**
 *
 * @param development
 */
function getTestContents(development: AncaDevelopment) {
  return `console.log("Hello, Test Anca!"); // ${development.fullPath}\n`;
}

/**
 *
 * @param development
 */
export async function checkNodejsSrc(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[SRC_FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === getSrcContents(development);
}

/**
 *
 * @param development
 */
export async function checkNodejsTest(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[TEST_FILE_PATH];
  console.log(contents);
  if (contents == null) {
    return false;
  }

  return contents === getTestContents(development);
}

/**
 *
 * @param development
 */
export async function fixNodejsSrc(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await fs.promises.mkdir(path.join(development.fullPath, "src"), {
    recursive: true,
  });
  await writeFolderFile(
    development.fullPath,
    SRC_FILE_PATH,
    getSrcContents(development),
  );
}

/**
 *
 * @param development
 */
export async function fixNodejsTest(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await fs.promises.mkdir(path.join(development.fullPath, "test"), {
    recursive: true,
  });
  await writeFolderFile(
    development.fullPath,
    TEST_FILE_PATH,
    getTestContents(development),
  );
}
