import { AncaDevelopment } from "../schema.js";
import { writeFolderFile } from "../utils.js";

const TSCONFIG = `{
  "compilerOptions": {
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "module": "es2022",
    "moduleResolution": "node",
    "outDir": "./build/dev",
    "rootDir": "./",
    "skipLibCheck": true,
    "strict": true,
    "target": "es2022"
  },
  "include": ["./src/**/*", "./test/**/*"]
}
`;

const FILE_PATH = "tsconfig.json";

/**
 *
 * @param development
 */
export async function checkNodejsTsconfigJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === TSCONFIG;
}

/**
 *
 * @param development
 */
export async function fixNodejsTsconfigJson(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(development.fullPath, FILE_PATH, TSCONFIG);
}
