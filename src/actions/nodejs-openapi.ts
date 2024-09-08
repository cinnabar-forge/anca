import crypto from "crypto";
import fs from "fs";
import path from "path";

import { AncaDevelopment } from "../schema.js";
import { capitalize, readFolderJsonFile } from "../utils.js";

/**
 * Generate a fallback file name based on the method and api path
 * @param method
 * @param apiPath
 */
function generateFallbackFileName(method: string, apiPath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(`${apiPath}`);
  return method + capitalize(hash.digest("hex").substring(0, 8));
}

/**
 *
 * @param development
 */
export async function generateNodejsOpenapiFiles(development: AncaDevelopment) {
  const openapi = (await readFolderJsonFile(
    development.fullPath,
    "openapi.json",
  )) as any;

  if (!openapi) {
    return;
  }

  const controllersDir = path.join(development.fullPath, "src", "controllers");
  const servicesDir = path.join(development.fullPath, "src", "services");
  const routesFile = path.join(development.fullPath, "src", "routes.ts");

  if (!fs.existsSync(controllersDir)) {
    fs.mkdirSync(controllersDir);
  }

  if (!fs.existsSync(servicesDir)) {
    fs.mkdirSync(servicesDir);
  }

  let routesImports = "";
  let routesFunctions = "";

  const pathsMethods: {
    fileName: string;
    functionName: string;
    method: string;
    operation: any;
    apiPath: string;
  }[] = [];

  Object.keys(openapi.paths)
    .sort()
    .forEach((apiPath) => {
      Object.keys(openapi.paths[apiPath])
        .sort()
        .forEach((method) => {
          const operation = openapi.paths[apiPath][method];
          const fileName =
            operation.operationId || generateFallbackFileName(method, apiPath);
          const functionName = `route${capitalize(fileName)}`;
          pathsMethods.push({
            apiPath,
            fileName,
            functionName,
            method,
            operation,
          });

          routesFunctions += `router.${method}("${apiPath}", ${functionName});\n`;
        });
    });

  pathsMethods.sort((a, b) => a.fileName.localeCompare(b.fileName));

  pathsMethods.forEach(({ fileName, functionName, operation }) => {
    routesImports += `import ${functionName} from "./controllers/${fileName}.js";\n`;

    const controllerFile = path.join(controllersDir, `${fileName}.ts`);
    const serviceFile = path.join(servicesDir, `${fileName}.ts`);

    let controllerContent = "";
    if (!fs.existsSync(serviceFile)) {
      fs.writeFileSync(
        serviceFile,
        `export async function ${fileName}(/* params */) {
  // Implementation goes here
}\n`,
      );
    }

    controllerContent += `import { Request, Response } from 'express';\n`;
    controllerContent += `\n`;
    controllerContent += `import { ${fileName} } from "../services/${fileName}.js";\n\n`;
    controllerContent += `/**\n`;
    controllerContent += ` * ${operation.summary || ""}\n`;
    controllerContent += ` * @param req\n`;
    controllerContent += ` * @param res\n`;
    controllerContent += ` */\n`;
    controllerContent += `export default async function (req: Request, res: Response) {\n`;
    controllerContent += `  try {\n`;
    controllerContent += `    const result = await ${fileName}();\n`;
    controllerContent += `    res.json(result);\n`;
    controllerContent += `  } catch (error) {\n`;
    controllerContent += `    console.error(error);\n`;
    controllerContent += `    res.status(500).json({ message: 'Internal Server Error' });\n`;
    controllerContent += `  }\n`;
    controllerContent += `}\n`;
    fs.writeFileSync(controllerFile, controllerContent);
  });

  fs.writeFileSync(
    routesFile,
    `import express from 'express';

${routesImports}
const router = express.Router();

${routesFunctions}
export default router;
`,
  );
}
