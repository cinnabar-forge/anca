import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";
import {
  CUSTOM_CONTENT_ANCHOR_END,
  CUSTOM_CONTENT_ANCHOR_START,
  extractCustomContent,
  extractNonCustomContent,
} from "./utils/custom-content.js";

const CUSTOM_CONTENT_DEFAULT = `const files = ["src/**/*.ts"];
const ignores = ["bin/**/*", "build/**/*", "dist/**/*"];
const rules = {};`;

const ESLINT = `import cinnabarPlugin from "@cinnabar-forge/eslint-plugin";

${CUSTOM_CONTENT_ANCHOR_START}

${CUSTOM_CONTENT_ANCHOR_END}

export default [
  ...cinnabarPlugin.default.map((config) => ({
    ...config,
    files,
  })),
  {
    files,
    rules,
  },
  {
    ignores,
  },
];
`;

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

  const customContent = extractNonCustomContent(contents);
  const defaultCustomContent = extractNonCustomContent(ESLINT);

  return customContent === defaultCustomContent;
}

/**
 *
 * @param development
 */
export async function fixNodejsEslintConfigJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  const customContent = contents
    ? extractCustomContent(contents)
    : CUSTOM_CONTENT_DEFAULT;

  const newContents = ESLINT.replace(
    `${CUSTOM_CONTENT_ANCHOR_START}\n\n${CUSTOM_CONTENT_ANCHOR_END}`,
    `${CUSTOM_CONTENT_ANCHOR_START}\n\n${customContent}\n\n${CUSTOM_CONTENT_ANCHOR_END}`,
  );

  await writeFolderFile(development.fullPath, FILE_PATH, newContents);
}
