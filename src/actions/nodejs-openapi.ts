import crypto from "crypto";
import fs from "fs";
import path from "path";

import { AncaDevelopment } from "../schema.js";
import { capitalize, readFolderJsonFile } from "../utils.js";

/**
 * Generate a fallback file name based on the method and api path
 * @param operationId
 * @param method
 * @param apiPath
 */
function generateOperationName(
  operationId: string,
  method: string,
  apiPath: string,
): string {
  const sanitizedOperationId = sanitizeOperationId(operationId) || null;
  if (sanitizedOperationId) {
    return sanitizedOperationId;
  }
  const hash = crypto.createHash("sha256");
  hash.update(`${apiPath}`);
  return method + capitalize(hash.digest("hex").substring(0, 8));
}

/**
 * Sanitize the operationId to camelCase and remove non-alphanumeric characters
 * @param operationId
 * @returns sanitized operationId
 */
function sanitizeOperationId(operationId: string): string {
  const parts = operationId.split(/[^a-zA-Z0-9]/).filter(Boolean);
  const camelCaseId = parts
    .map((part, index) => {
      if (index === 0) return part.toLowerCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");

  if (/^\d/.test(camelCaseId)) {
    return (
      "operation" + camelCaseId.charAt(0).toUpperCase() + camelCaseId.slice(1)
    );
  }

  return camelCaseId;
}

/**
 * Generate TypeScript models (interfaces) based on OpenAPI schema
 * @param development
 * @param openapi
 */
function generateTypeScriptModels(development: AncaDevelopment, openapi: any) {
  const modelsDir = path.join(development.fullPath, "src", "models");
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir);
  }

  const schemaComponents = openapi.components?.schemas || {};
  const models: Record<string, string> = {};

  const processSchema = function (schema: any, modelName: string) {
    console.log(modelName, schema);
    if (models[modelName]) {
      console.log("Model already exists", modelName);
      return;
    }
    const properties = Object.keys(schema.properties || {})
      .map((propertyName) => {
        const propertySchema = schema.properties[propertyName];
        const propertyType = getPropertyType(propertySchema);
        return `${propertyName}: ${propertyType};`;
      })
      .join("\n  ");

    models[modelName] = `interface ${modelName} {
  ${properties}
}
`;
  };

  let count = 0;

  const processReferableSchema = function (schema: any, fallbackName?: string) {
    if (!schema.$ref && schema.type === "object") {
      processSchema(schema, fallbackName || `Generic${count++}`);
    }
  };

  // preparing predefined schemas to be reused later
  Object.keys(schemaComponents).forEach((modelName) => {
    const schema = schemaComponents[modelName];
    const interfaceName = `${capitalize(modelName)}`;
    processSchema(schema, interfaceName);
  });

  Object.keys(openapi.paths).forEach((apiPath) => {
    Object.keys(openapi.paths[apiPath]).forEach((method) => {
      console.log(apiPath, method);
      const operation = openapi.paths[apiPath][method];
      const fileName = generateOperationName(
        operation.operationId,
        method,
        apiPath,
      );
      const requestBody = operation.requestBody;
      const parameters = operation.parameters;
      const responses = operation.responses;

      if (
        requestBody &&
        requestBody.content &&
        requestBody.content["application/json"]
      ) {
        processReferableSchema(
          requestBody.content["application/json"].schema,
          capitalize(fileName + "JsonRequest"),
        );
      }

      if (parameters) {
        const schemaParams: Record<string, any> = {
          type: "object",
          properties: {},
        };
        const schemaQuery: Record<string, any> = {
          type: "object",
          properties: {},
        };
        parameters.forEach((parameter: any) => {
          if (parameter.in === "path") {
            schemaParams.properties[parameter.name] = parameter.schema;
          } else if (parameter.in === "query") {
            schemaQuery.properties[parameter.name] = parameter.schema;
          }
        });
        processSchema(schemaParams, `${capitalize(fileName)}Params`);
        processSchema(schemaQuery, `${capitalize(fileName)}Query`);
      }

      if (responses) {
        Object.keys(responses).forEach((responseStatus) => {
          const response = responses[responseStatus];
          if (response.content && response.content["application/json"]) {
            processReferableSchema(
              response.content["application/json"].schema,
              capitalize(fileName + responseStatus + "JsonResponse"),
            );
          }
        });
      }
    });
  });

  Object.keys(models).forEach((modelName) => {
    const modelContent = models[modelName];
    const modelFile = path.join(modelsDir, `${modelName}.ts`);
    fs.writeFileSync(modelFile, modelContent);
  });
}

/**
 *
 * @param propertySchema
 */
function getPropertyType(propertySchema: any): string {
  if (!propertySchema) {
    return "any";
  }
  if (propertySchema.type === "array") {
    return `Array<${getPropertyType(propertySchema.items)}> `;
  } else if (propertySchema.type === "object") {
    return getPropertyType(propertySchema.properties);
  } else if (propertySchema.type === "string") {
    return "string";
  } else if (
    propertySchema.type === "integer" ||
    propertySchema.type === "number"
  ) {
    return "number";
  } else if (propertySchema.type === "boolean") {
    return "boolean";
  } else {
    return "any";
  }
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

  generateTypeScriptModels(development, openapi);

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
          const fileName = generateOperationName(
            operation.operationId,
            method,
            apiPath,
          );
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
