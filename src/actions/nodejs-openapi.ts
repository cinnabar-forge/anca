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
  response?: ModelData[];
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
      ? `${modelData.name}[]`
      : modelData.name
    : "unknown";
}

/**
 *
 * @param development
 */
function getDevelopmentModelsPath(development: AncaDevelopment): {
  filePath: string;
  codePath: string;
  isFile: boolean;
  isModule: boolean;
} {
  const openapiConfig = development.state?.config.development?.nodejsOpenapi;

  const modelsRelativeLocation =
    openapiConfig?.modelsLocation || "./src/models";

  return {
    codePath: openapiConfig?.modelsModule || modelsRelativeLocation,
    filePath: path.join(
      development.monorepoFullPath || development.fullPath,
      modelsRelativeLocation,
    ),
    isFile: openapiConfig?.modelsLocation
      ? openapiConfig?.modelsLocationType === "file"
      : false,
    isModule: openapiConfig?.modelsModule != null,
  };
}

/**
 *
 * @param development
 * @param model
 */
function getCodeModelPath(development: AncaDevelopment, model: string) {
  const modelsLocation = getDevelopmentModelsPath(development);

  return modelsLocation.isModule
    ? modelsLocation.codePath
    : modelsLocation.isFile
      ? modelsLocation.filePath
      : path.resolve(modelsLocation.codePath, `${model}.js`);
}

/**
 * Generate TypeScript models (interfaces) based on OpenAPI schema
 * @param development
 * @param openapi
 */
function generateTypeScriptModels(development: AncaDevelopment, openapi: any) {
  const modelsLocation = getDevelopmentModelsPath(development);

  console.log("generateTypeScriptModels", "modelsLocation", modelsLocation);

  if (!modelsLocation.isFile && !fs.existsSync(modelsLocation.filePath)) {
    fs.mkdirSync(modelsLocation.filePath);
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
        return `${propertyName}?: ${propertyType};`;
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

  if (openapi.paths) {
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
              console.log(
                "responseModel",
                responseStatus,
                (name && modelsByArray[name]) || name,
              );
              if (name) {
                if (modelsByFile[fileName].response == null) {
                  modelsByFile[fileName].response = [];
                }
                modelsByFile[fileName].response.push({
                  array: modelsByArray[name] ? true : false,
                  name: modelsByArray[name] || name,
                });
              }
            }
          });
        }
      });
    });
  }

  if (modelsLocation.isFile) {
    let modelContent = "";
    Object.keys(models).forEach((modelName) => {
      modelContent += models[modelName];
      modelContent += "\n";
    });
    fs.writeFileSync(modelsLocation.filePath, modelContent);
  } else {
    Object.keys(models).forEach((modelName) => {
      const modelContent = models[modelName];
      const modelFile = path.join(modelsLocation.filePath, `${modelName}.ts`);
      fs.writeFileSync(modelFile, modelContent);
    });
  }

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

  if (openapi.paths) {
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
  }

  pathsMethods.sort((a, b) => a.fileName.localeCompare(b.fileName));

  pathsMethods.forEach(({ fileName, functionName, operation }) => {
    routesImports += `import ${functionName} from "./controllers/${fileName}.js";\n`;

    const controllerFile = path.join(controllersDir, `${fileName}.ts`);
    const serviceFile = path.join(servicesDir, `${fileName}.ts`);

    const fileModelData = modelsByFile[fileName];

    let responsesImportContent = "";
    fileModelData?.response?.forEach((responseModelData) => {
      responsesImportContent += `import { ${responseModelData.name} } from "${getCodeModelPath(development, responseModelData.name)}";\n`;
    });

    const responsesTypesContent =
      fileModelData?.response?.map(getModelData).join(" | ") || "unknown";

    // eslint-disable-next-line sonarjs/no-gratuitous-expressions, no-constant-condition
    if (true) {
      // !fs.existsSync(serviceFile)
      let serviceContent = "";

      if (responsesImportContent) {
        serviceContent += responsesImportContent;
        serviceContent += `\n`;
      }

      serviceContent += "/**\n";
      serviceContent += ` * ${operation.summary || ""}\n`;
      serviceContent += " */\n";
      serviceContent += `export async function ${fileName}(): Promise<${responsesTypesContent}> {\n`;
      serviceContent += `  // This stub is generated if this file doesn't exist.\n`;
      serviceContent += `  // You can change body of this function, but it should comply with controllers' call.\n`;
      serviceContent += `  return ${responsesTypesContent.includes("[]") ? "[]" : responsesTypesContent !== "unknown" ? "{}" : "null"};\n`;
      serviceContent += `}\n`;

      fs.writeFileSync(serviceFile, serviceContent);
    }

    let controllerContent = "";

    controllerContent += `import { Request, Response } from 'express';\n`;
    controllerContent += `import { ${fileName} } from "../services/${fileName}.js";\n`;
    if (fileModelData?.request) {
      controllerContent += `import { ${fileModelData.request.name} } from "${getCodeModelPath(development, fileModelData.request.name)}";\n`;
    }
    if (fileModelData?.params) {
      controllerContent += `import { ${fileModelData.params.name} } from "${getCodeModelPath(development, fileModelData.params.name)}";\n`;
    }
    if (fileModelData?.query) {
      controllerContent += `import { ${fileModelData.query.name} } from "${getCodeModelPath(development, fileModelData.query.name)}";\n`;
    }
    if (responsesImportContent) {
      controllerContent += responsesImportContent;
    }

    controllerContent += `\n`;
    controllerContent += `/**\n`;
    controllerContent += ` * ${operation.summary || ""}\n`;
    controllerContent += ` * @param req\n`;
    controllerContent += ` * @param res\n`;
    controllerContent += ` */\n`;
    controllerContent += `export default async function (req: Request<${getModelData(fileModelData?.params)}, ${"unknown"}, ${getModelData(fileModelData?.request)}, ${getModelData(fileModelData?.query)}>, res: Response<${responsesTypesContent}>) {\n`;
    controllerContent += `  try {\n`;
    controllerContent += `    const result: ${responsesTypesContent} = await ${fileName}();\n`;
    switch (operation.responses && operation.responses[200]?.content.type) {
      case "application/json":
        controllerContent += `    res.status(200).json(result);\n`;
        break;
      case "application/xml":
        controllerContent += `    res.status(200).xml(result);\n`;
        break;
      default:
        controllerContent += `    res.status(200).send(result);\n`;
    }
    controllerContent += `  } catch (error) {\n`;
    controllerContent += `    console.error(error);\n`;
    controllerContent += `    res.end();\n`;
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
