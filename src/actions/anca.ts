import { promptOptions } from "clivo";

import {
  ANCA_CONFIG_SCHEMA,
  AncaConfig,
  AncaConfigStack,
  AncaConfigType,
} from "../schema.js";
import { isAjvValid } from "../utils.js";

/**
 * Check the Anca configuration file.
 * @param contents - The contents of the Anca configuration file.
 */
export function checkAnca(contents: object) {
  return isAjvValid(ANCA_CONFIG_SCHEMA, contents);
}

/**
 * Fix the Anca configuration file.
 * @param contents
 */
export async function fixAncaConfig(contents: AncaConfig) {
  console.log("fixAncaConfig", contents);
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
        { label: "Python", name: "python" },
        { label: "Unsupported (other)", name: "unsupported" },
      ])
    ).name as AncaConfigStack;
  }
}
