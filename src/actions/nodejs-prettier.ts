import type { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const RC = "{}\n";

const IGNORE = `# General
**/.git
**/.svn
**/.hg

# Binaries
/bin

# Devcontainer
.devcontainer

# Node.js
**/node_modules
package-lock.json

# Distributions
/build
/dist

# Cinnabar Meta
**/cinnabar.js
**/cinnabar.ts
cinnabar.json
CHANGELOG.md

# Anca
anca.json
esbuild.js
eslint.config.js
openapi.json
`;

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
  const contents = development.state.files[RC_FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === RC;
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

  return contents === IGNORE;
}

/**
 *
 * @param development
 */
export async function fixNodejsPrettierRc(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(development.fullPath, RC_FILE_PATH, RC);
}

/**
 *
 * @param development
 */
export async function fixNodejsPrettierIgnore(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(development.fullPath, IGNORE_FILE_PATH, IGNORE);
}
