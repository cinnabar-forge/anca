import crypto from "crypto";
import fs from "fs";
import path from "path";

import { AncaDevelopment } from "../schema.js";
import { capitalize, readFolderJsonFile } from "../utils.js";

interface ModelData {
  name: string;
  array?: boolean;
}

interface ModelsByFile {
  request?: ModelData;
  params?: ModelData;
  query?: ModelData;
  response?: ModelData;
}

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
  const sanitizedOperationId = operationId
    ? sanitizeOperationId(operationId)
    : null;
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
  const camelCaseId =
    parts.length > 1
      ? parts
          .map((part, index) => {
            if (index === 0) return part.toLowerCase();
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("")
      : operationId;

  if (/^\d/.test(camelCaseId)) {
    return (
      "operation" + camelCaseId.charAt(0).toUpperCase() + camelCaseId.slice(1)
    );
  }

  return camelCaseId;
}

/**
 * Get model data as string
 * @param modelData
 */
function getModelData(modelData: ModelData | undefined | null): string {
  return modelData
    ? modelData.array
      ? `Array<${modelData.name}>`
      : modelData.name
    : "unknown";
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
  const modelsByFile: Record<string, ModelsByFile> = {};
  const modelsByArray: Record<string, string> = {};

  const processSchema = function (schema: any, modelName: string) {
    console.log(modelName, schema);
    if (models[modelName]) {
      console.log("Model already exists", modelName);
      return true;
    }
    let hasParams = false;
    const properties = Object.keys(schema.properties || {})
      .map((propertyName) => {
        if (!hasParams) {
          hasParams = true;
        }
        hasParams = true;
        const propertySchema = schema.properties[propertyName];
        const propertyType = getPropertyType(propertySchema);
        return `${propertyName}: ${propertyType};`;
      })
      .join("\n  ");

    if (hasParams) {
      models[modelName] = `export interface ${modelName} {
  ${properties}
}
`;
    }

    return hasParams;
  };

  let count = 0;

  const processReferableSchema = function (
    schema: any,
    fallbackName: string,
  ): string | false {
    if (schema.$ref) {
      const refParts = schema.$ref.split("/");
      console.log("ref", refParts);
      return refParts[refParts.length - 1];
    }
    if (schema.type === "array" && schema.items && schema.items.$ref) {
      const refParts = schema.items.$ref.split("/");
      modelsByArray[fallbackName] = refParts[refParts.length - 1];
      console.log("ref in array", refParts);
      return refParts[refParts.length - 1];
    }
    if (schema.type === "object") {
      const name = fallbackName || `Generic${count++}`;
      console.log("object", name);
      if (processSchema(schema, name)) {
        return name;
      }
    }
    console.log("no schema, only", schema.type);
    return false;
  };

  console.log("\n", "predefined models");

  // preparing predefined schemas to be reused later
  Object.keys(schemaComponents).forEach((modelName) => {
    const schema = schemaComponents[modelName];
    const interfaceName = `${capitalize(modelName)}`;
    processReferableSchema(schema, interfaceName);
  });

  Object.keys(openapi.paths).forEach((apiPath) => {
    Object.keys(openapi.paths[apiPath]).forEach((method) => {
      console.log("\n", apiPath, method);
      const operation = openapi.paths[apiPath][method];
      const fileName = generateOperationName(
        operation.operationId,
        method,
        apiPath,
      );

      if (!modelsByFile[fileName]) {
        modelsByFile[fileName] = {};
      }

      const requestBody = operation.requestBody;
      const parameters = operation.parameters;
      const responses = operation.responses;

      if (
        requestBody &&
        requestBody.content &&
        requestBody.content["application/json"]
      ) {
        const name = processReferableSchema(
          requestBody.content["application/json"].schema,
          capitalize(fileName + "Request"),
        );
        console.log("requestBody", (name && modelsByArray[name]) || name);
        if (name) {
          modelsByFile[fileName].request = {
            array: modelsByArray[name] ? true : false,
            name: modelsByArray[name] || name,
          };
        }
      }

      if (parameters) {
        console.log("parameters");
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
        const paramsModel = `${capitalize(fileName)}Params`;
        const queryModel = `${capitalize(fileName)}Query`;
        if (processSchema(schemaParams, paramsModel)) {
          modelsByFile[fileName].params = { name: paramsModel };
        }
        if (processSchema(schemaQuery, queryModel)) {
          modelsByFile[fileName].query = { name: queryModel };
        }
      }

      if (responses) {
        console.log("responses");
        Object.keys(responses).forEach((responseStatus) => {
          const response = responses[responseStatus];
          if (response.content && response.content["application/json"]) {
            const name = processReferableSchema(
              response.content["application/json"].schema,
              capitalize(fileName + "Response"),
            );
            console.log("responseModel", (name && modelsByArray[name]) || name);
            if (name) {
              modelsByFile[fileName].response = {
                array: modelsByArray[name] ? true : false,
                name: modelsByArray[name] || name,
              };
            }
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

  return { models, modelsByFile };
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

  const { modelsByFile } = generateTypeScriptModels(development, openapi);

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

    const fileModelData = modelsByFile[fileName];

    controllerContent += `import { Request, Response } from 'express';\n`;
    controllerContent += `import { ${fileName} } from "../services/${fileName}.js";\n`;
    if (fileModelData?.request) {
      controllerContent += `import { ${fileModelData.request.name} } from "../models/${fileModelData.request.name}.js";\n`;
    }
    if (fileModelData?.params) {
      controllerContent += `import { ${fileModelData.params.name} } from "../models/${fileModelData.params.name}.js";\n`;
    }
    if (fileModelData?.query) {
      controllerContent += `import { ${fileModelData.query.name} } from "../models/${fileModelData.query.name}.js";\n`;
    }
    if (fileModelData?.response) {
      controllerContent += `import { ${fileModelData.response.name} } from "../models/${fileModelData.response.name}.js";\n`;
    }

    controllerContent += `\n`;
    controllerContent += `/**\n`;
    controllerContent += ` * ${operation.summary || ""}\n`;
    controllerContent += ` * @param req\n`;
    controllerContent += ` * @param res\n`;
    controllerContent += ` */\n`;
    controllerContent += `export default async function (req: Request<${getModelData(fileModelData?.params)}, ${"unknown"}, ${getModelData(fileModelData?.request)}, ${getModelData(fileModelData?.query)}>, res: Response<${getModelData(fileModelData?.response)}>) {\n`;
    controllerContent += `  try {\n`;
    controllerContent += `    const result: ${getModelData(fileModelData?.response)} = await ${fileName}();\n`;
    controllerContent += `    res.status(${operation.responses[200] ? 200 : 500}).json(result);\n`;
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
