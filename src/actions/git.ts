import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const IGNORE_ALL = `# Editor directories and files
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.vscode

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Temp folder
tmp
`;

const IGNORE_NODEJS = `# Built sources
/dist
/build
*.spec

# Dependency directories
node_modules/
jspm_packages/
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*
.yarn-integrity

# Local settings
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# Node.js logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Output of 'npm pack'
*.tgz
`;

const FILE_PATH = ".gitignore";

/**
 *
 * @param development
 */
function getContents(development: AncaDevelopment) {
  if (development.state == null) {
    return "";
  }
  if (development.state.config.stack === "nodejs") {
    return IGNORE_ALL + "\n" + IGNORE_NODEJS;
  }

  return IGNORE_ALL;
}

/**
 *
 * @param development
 */
export async function checkGitIgnore(development: AncaDevelopment) {
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
export async function fixGitIgnore(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    FILE_PATH,
    getContents(development),
  );
}
