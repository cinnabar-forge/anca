import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const ESLINT = `import cinnabarPlugin from "@cinnabar-forge/eslint-plugin";

const files = ["src/**/*.ts"];
const ignores = ["bin/**/*", "build/**/*", "dist/**/*"];

export default [
  ...cinnabarPlugin.default.map((config) => ({
    ...config,
    files,
  })),
  {
    files,
    rules: {},
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

  return contents === ESLINT;
}

/**
 *
 * @param development
 */
export async function fixNodejsEslintConfigJs(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(development.fullPath, FILE_PATH, ESLINT);
}
