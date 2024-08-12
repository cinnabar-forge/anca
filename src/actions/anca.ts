import { promptOptions, promptText } from "clivo";

import {
  ANCA_CONFIG_SCHEMA,
  AncaConfigStack,
  AncaConfigType,
  AncaDevelopment,
} from "../schema.js";
import { isAjvValid, writeFolderJsonFile } from "../utils.js";

const FILE_PATH = "anca.json";

/**
 * Check the Anca configuration file.
 * @param development
 */
export async function checkAnca(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.config;
  if (contents == null) {
    return false;
  }
  return isAjvValid(ANCA_CONFIG_SCHEMA, contents);
}

/**
 * Fix the Anca configuration file.
 * @param development
 */
export async function fixAncaConfig(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }

  let contents = development.state.config;
  if (contents == null) {
    contents = {};
    development.state.config = contents;
  }

  if (contents.namings == null) {
    contents.namings = { text: development.data.name };
  }
  if (contents.namings.text == null) {
    contents.namings.text = development.data.name;
  }

  if (contents.type == null || AncaConfigType[contents.type] == null) {
    contents.type = (
      await promptOptions("\nChoose project type:", [
        { label: "App", name: "app" },
        { label: "Library", name: "library" },
        { label: "Project (other)", name: "project" },
      ])
    ).name as AncaConfigType;
  }

  if (contents.stack == null || AncaConfigStack[contents.stack] == null) {
    contents.stack = (
      await promptOptions("\nChoose project stack:", [
        { label: "Nodejs", name: "nodejs" },
        { label: "Unsupported (other)", name: "unsupported" },
      ])
    ).name as AncaConfigStack;
  }

  // eslint-disable-next-line sonarjs/no-collapsible-if
  if (contents.stack === AncaConfigStack.nodejs) {
    if (contents.namings.npmPackage == null) {
      contents.namings.npmPackage = await promptText("\nNPM package name:");
    }
  }

  await writeFolderJsonFile(development.fullPath, FILE_PATH, contents);
}
