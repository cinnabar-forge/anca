import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import prettierEstree from "prettier/plugins/estree";
import prettierTypescript from "prettier/plugins/typescript";
import prettier from "prettier/standalone";

import { AncaDevelopment } from "../schema.js";
import {
  capitalize,
  getHttpCodeFunctionText,
  readFolderJsonFile,
} from "../utils.js";

interface ModelData {
  array?: boolean;
  name: string;
}

interface ModelDataResponse {
  array?: boolean;
  default?: boolean;
  name: string;
}

interface ModelsByFile {
  params?: ModelData;
  query?: ModelData;
  request?: ModelData;
  response?: ModelDataResponse[];
}

interface ImportsData {
  defaultImport?: string;
  otherImports?: string[];
}
interface Imports {
  files?: Record<string, ImportsData>;
  modules?: Record<string, ImportsData>;
}

const prettierPlugins = [prettierEstree, prettierTypescript];

const contentTypesExpressMapping: Record<string, string> = {
  "application/json": "json",
  "application/xml": "xml",
};

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
  const sanitizedOperationId = operationId ? camelCaseText(operationId) : null;
  if (sanitizedOperationId) {
    return sanitizedOperationId;
  }
  const hash = crypto.createHash("sha256");
  hash.update(`${apiPath}`);
  return method + capitalize(hash.digest("hex").substring(0, 8));
}

/**
 * Sanitize the operationId to camelCase and remove non-alphanumeric characters
 * @param text
 * @param pascalCase
 * @returns sanitized operationId
 */
function camelCaseText(text: string, pascalCase?: boolean): string {
  const parts = text.split(/[^a-zA-Z0-9]/).filter(Boolean);
  const camelCaseId =
    parts.length > 1
      ? parts
          .map((part, index) => {
            if (index === 0 && !pascalCase) return part.toLowerCase();
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("")
      : text;

  if (/^\d/.test(camelCaseId)) {
    return camelCaseId.charAt(0).toUpperCase() + camelCaseId.slice(1);
  }

  return camelCaseId;
}

/**
 * Get model data as string
 * @param modelData
 */
function getModelData(modelData: ModelData | null | undefined): string {
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
  codePath: string;
  filePath: string;
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

  return {
    isModule: modelsLocation.isModule,
    path: modelsLocation.isFile
      ? modelsLocation.codePath
      : path.resolve(modelsLocation.codePath, `${model}.js`),
  };
}

/**
 *
 * @param development
 */
async function generateTypeScriptEssentialModels(development: AncaDevelopment) {
  const modelsLocation = path.resolve(development.fullPath, "./src/types");

  console.log(
    "generateTypeScriptEssentialModels",
    "modelsLocation",
    modelsLocation,
  );

  await fs.writeFile(
    path.join(modelsLocation, "anca.ts"),
    await prettier.format(
      `export interface ServiceAmbiguousResponse<D, S, T = undefined> {
  code: S;
  data: D;
  type?: T;
  error?: string;
  redirectUrl?: string;
}
`,
      { parser: "typescript", plugins: prettierPlugins },
    ),
  );
}

/**
 * Generate TypeScript models (interfaces) based on OpenAPI schema
 * @param development
 * @param openapi
 */
async function generateTypeScriptModels(
  development: AncaDevelopment,
  openapi: any,
) {
  const modelsLocation = getDevelopmentModelsPath(development);

  console.log("generateTypeScriptModels", "modelsLocation", modelsLocation);

  if (!modelsLocation.isFile) {
    fs.mkdir(modelsLocation.filePath, { recursive: true });
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
  ): false | string {
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

        if (requestBody && requestBody.content) {
          Object.keys(requestBody.content).forEach((contentType) => {
            const sanitizedContentType = camelCaseText(contentType, true);
            const name = processReferableSchema(
              requestBody.content[contentType].schema,
              capitalize(fileName + sanitizedContentType + "Request"),
            );
            console.log("requestBody", (name && modelsByArray[name]) || name);
            if (name) {
              modelsByFile[fileName].request = {
                array: modelsByArray[name] ? true : false,
                name: modelsByArray[name] || name,
              };
            }
          });
        }

        if (parameters) {
          console.log("parameters");
          const schemaParams: Record<string, any> = {
            properties: {},
            type: "object",
          };
          const schemaQuery: Record<string, any> = {
            properties: {},
            type: "object",
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
            if (response.content) {
              Object.keys(response.content).forEach((contentType) => {
                const sanitizedContentType = camelCaseText(contentType, true);
                const name = processReferableSchema(
                  response.content[contentType].schema,
                  capitalize(
                    fileName +
                      (responseStatus
                        ? getHttpCodeFunctionText(responseStatus)
                        : responseStatus) +
                      sanitizedContentType +
                      "Response",
                  ),
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
                    default: responseStatus === "default",
                    name: modelsByArray[name] || name,
                  });
                }
              });
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
    await fs.writeFile(
      modelsLocation.filePath,
      await prettier.format(modelContent, {
        parser: "typescript",
        plugins: prettierPlugins,
      }),
    );
  } else {
    Object.keys(models).forEach(async (modelName) => {
      const modelContent = models[modelName];
      const modelFile = path.join(modelsLocation.filePath, `${modelName}.ts`);
      await fs.writeFile(
        modelFile,
        await prettier.format(modelContent, {
          parser: "typescript",
          plugins: prettierPlugins,
        }),
      );
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
 * Add import to the imports object
 * @param imports
 * @param importPath
 * @param importName
 * @param params
 * @param params.isDefault
 * @param params.isModule
 */
function addImport(
  imports: Imports,
  importPath: string,
  importName: string,
  params?: { isDefault?: boolean; isModule?: boolean },
) {
  let importsDict;
  if (params?.isModule) {
    if (imports.modules == null) {
      imports.modules = {};
    }
    importsDict = imports.modules;
  } else {
    if (imports.files == null) {
      imports.files = {};
    }
    importsDict = imports.files;
  }
  if (importsDict[importPath] == null) {
    importsDict[importPath] = {};
  }
  if (params?.isDefault) {
    importsDict[importPath].defaultImport = importName;
  } else {
    if (importsDict[importPath].otherImports == null) {
      importsDict[importPath].otherImports = [];
    }
    importsDict[importPath].otherImports.push(importName);
  }
}

/**
 * Generate imports code part
 * @param importsDict
 */
function generateImportsCodePart(importsDict?: Record<string, ImportsData>) {
  let importsCodePart = "";
  if (!importsDict) {
    return importsCodePart;
  }
  Object.keys(importsDict)
    .sort()
    .forEach((importPath) => {
      const importData = importsDict[importPath];
      let importCodePart = "";
      if (importData.defaultImport) {
        importCodePart += importData.defaultImport;
      }
      if (importData.otherImports) {
        let importOtherCodePart = "";
        importData.otherImports.sort().forEach((importName) => {
          importOtherCodePart += `${importOtherCodePart ? ", " : ""}${importName}`;
        });
        if (importOtherCodePart) {
          importCodePart += `${importCodePart ? ", " : ""}{ ${importOtherCodePart} }`;
        }
      }
      if (importCodePart) {
        importsCodePart += `import ${importCodePart} from "${importPath}";\n`;
      }
    });
  return importsCodePart;
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

  await generateTypeScriptEssentialModels(development);

  const { modelsByFile } = await generateTypeScriptModels(development, openapi);

  const controllersDir = path.join(development.fullPath, "src", "controllers");
  const servicesDir = path.join(development.fullPath, "src", "services");
  const routesFile = path.join(development.fullPath, "src", "routes.ts");
  const typesDir = path.join(development.fullPath, "src", "types");
  // const typesFile = path.join(typesDir, "anca.ts");

  fs.mkdir(controllersDir, { recursive: true });
  fs.mkdir(servicesDir, { recursive: true });
  fs.mkdir(typesDir, { recursive: true });

  // const typesInterfaces = "";

  const routesImports: Imports = {};
  let routesAuth = false;
  let routesFunctions = "";

  const pathsMethods: {
    apiPath: string;
    fileName: string;
    functionName: string;
    isAmbiguous: boolean;
    method: string;
    operation: any;
    responseCodes: number[];
    responseContentTypes: string[];
    responseErrorContentTypes?: string[];
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

            const responseCodes: Set<number> = new Set<number>();
            const responseContentTypes: Set<string> = new Set<string>();
            const responseErrorContentTypes: Set<string> = new Set<string>();
            if (operation.responses) {
              Object.keys(operation.responses).forEach((code: string) => {
                const response = operation.responses[code];
                if (code === "default") {
                  if (response.content) {
                    Object.keys(response.content).forEach((contentType) => {
                      responseErrorContentTypes.add(contentType);
                    });
                  }
                  return;
                }
                const codeInt = parseInt(code) || 200;
                responseCodes.add(codeInt);
                if (response.content) {
                  Object.keys(response.content).forEach((contentType) => {
                    responseContentTypes.add(contentType);
                  });
                }
              });
            }

            if (responseCodes.size === 0) {
              responseCodes.add(200);
            }

            const responseCodesArray = Array.from(responseCodes).sort();
            const responseContentTypesArray = Array.from(responseContentTypes);
            const responseErrorContentTypesArray = Array.from(
              responseErrorContentTypes,
            );

            pathsMethods.push({
              apiPath,
              fileName,
              functionName,
              isAmbiguous:
                responseCodesArray.length > 1 ||
                responseContentTypesArray.length > 1,
              method,
              operation,
              responseCodes: responseCodesArray,
              responseContentTypes: responseContentTypesArray,
              responseErrorContentTypes: responseErrorContentTypesArray,
            });

            if (!routesAuth && operation.security) {
              routesAuth = true;
              addImport(
                routesImports,
                "./middleware/isAuthenticated.js",
                "isAuthenticated",
              );
            }

            const apiPathExpress = apiPath.replace(/{([^}]+)}/g, ":$1");

            routesFunctions += `router.${method}("${apiPathExpress}", ${operation.security ? "isAuthenticated, " : ""}${functionName});\n`;
          });
      });
  }

  pathsMethods.sort((a, b) => a.fileName.localeCompare(b.fileName));

  pathsMethods.forEach(
    async ({
      fileName,
      functionName,
      isAmbiguous,
      operation,
      responseCodes,
      responseContentTypes,
      responseErrorContentTypes,
    }) => {
      addImport(routesImports, "./controllers/${fileName}.js", functionName, {
        isDefault: true,
      });

      const controllerFile = path.join(controllersDir, `${fileName}.ts`);
      const serviceFile = path.join(servicesDir, `${fileName}.ts`);

      const fileModelData = modelsByFile[fileName];

      const responseCodesTypeCodePart = responseCodes.join(" | ");

      const responseServiceContentTypesTypeCodePart =
        responseContentTypes.length > 0
          ? ', "' + responseContentTypes.join(`" | "`) + '"'
          : "";

      const filterDuplicates = (value: any, index: number, self: any[]) =>
        self.indexOf(value) === index;

      const responsesControllerImport: Imports = {};
      const responsesServiceImport: Imports = {};
      if (isAmbiguous) {
        addImport(
          responsesControllerImport,
          "../types/anca.js",
          "ServiceAmbiguousResponse",
        );
        addImport(
          responsesServiceImport,
          "../types/anca.js",
          "ServiceAmbiguousResponse",
        );
      }

      fileModelData?.response
        ?.map((value) => value.name)
        .filter(filterDuplicates)
        .forEach((responseModelDataName) => {
          const modelPath = getCodeModelPath(
            development,
            responseModelDataName,
          );
          addImport(
            responsesControllerImport,
            modelPath.path,
            responseModelDataName,
            { isModule: modelPath.isModule },
          );
        });
      fileModelData?.response
        ?.filter((value) => value.default !== true)
        .map((value) => value.name)
        .filter(filterDuplicates)
        .forEach((responseModelDataName) => {
          const modelPath = getCodeModelPath(
            development,
            responseModelDataName,
          );
          addImport(
            responsesServiceImport,
            modelPath.path,
            responseModelDataName,
            { isModule: modelPath.isModule },
          );
        });
      const responsesTypesCodePart =
        fileModelData?.response
          ?.map(getModelData)
          .filter(filterDuplicates)
          .sort()
          .join(" | ") || "unknown";
      const responsesServiceTypesCodePart =
        fileModelData?.response
          ?.filter((value) => value.default !== true)
          .map(getModelData)
          .filter(filterDuplicates)
          .sort()
          .join(" | ") || "unknown";

      let serviceArgumentsFunc = "";
      let serviceArgumentsCallCnt = "";
      let serviceArgumentsCallSrv = "";
      let serviceArgumentsJsdoc = "";

      let controllerContent = "";

      addImport(responsesControllerImport, "express", "Request", {
        isModule: true,
      });
      addImport(responsesControllerImport, "express", "Response", {
        isModule: true,
      });
      addImport(
        responsesControllerImport,
        `../services/${fileName}.js`,
        fileName,
      );

      if (fileModelData?.request) {
        const modelPath = getCodeModelPath(
          development,
          fileModelData.request.name,
        );
        addImport(
          responsesControllerImport,
          modelPath.path,
          fileModelData.request.name,
          { isModule: modelPath.isModule },
        );
        addImport(
          responsesServiceImport,
          modelPath.path,
          fileModelData.request.name,
          { isModule: modelPath.isModule },
        );

        serviceArgumentsFunc += `request: ${fileModelData.request.name}`;
        serviceArgumentsJsdoc += ` * @param request\n`;
        serviceArgumentsCallSrv += `request`;
        serviceArgumentsCallCnt += `req.body`;
      }
      if (fileModelData?.params) {
        const modelPath = getCodeModelPath(
          development,
          fileModelData.params.name,
        );
        addImport(
          responsesControllerImport,
          modelPath.path,
          fileModelData.params.name,
          { isModule: modelPath.isModule },
        );
        addImport(
          responsesServiceImport,
          modelPath.path,
          fileModelData.params.name,
          { isModule: modelPath.isModule },
        );
        serviceArgumentsFunc += `${serviceArgumentsFunc ? ", " : ""}params: ${fileModelData.params.name}`;
        serviceArgumentsJsdoc += ` * @param params\n`;
        serviceArgumentsCallSrv += `${serviceArgumentsCallSrv ? ", " : ""}params`;
        serviceArgumentsCallCnt += `${serviceArgumentsCallCnt ? ", " : ""}req.params`;
      }
      if (fileModelData?.query) {
        const modelPath = getCodeModelPath(
          development,
          fileModelData.query.name,
        );
        addImport(
          responsesControllerImport,
          modelPath.path,
          fileModelData.query.name,
          { isModule: modelPath.isModule },
        );
        addImport(
          responsesServiceImport,
          modelPath.path,
          fileModelData.query.name,
          { isModule: modelPath.isModule },
        );
        serviceArgumentsFunc += `${serviceArgumentsFunc ? ", " : ""}query: ${fileModelData.query.name}`;
        serviceArgumentsJsdoc += ` * @param query\n`;
        serviceArgumentsCallSrv += `${serviceArgumentsCallSrv ? ", " : ""}query`;
        serviceArgumentsCallCnt += `${serviceArgumentsCallCnt ? ", " : ""}req.query`;
      }

      if (responsesControllerImport) {
        controllerContent += generateImportsCodePart(
          responsesControllerImport.modules,
        );
        controllerContent += `\n`;
        controllerContent += generateImportsCodePart(
          responsesControllerImport.files,
        );
      }

      // eslint-disable-next-line sonarjs/no-gratuitous-expressions, no-constant-condition
      if (true) {
        // !fs.existsSync(serviceFile)
        let serviceContent = "";

        if (responsesServiceImport) {
          serviceContent += generateImportsCodePart(
            responsesServiceImport.modules,
          );
          if (responsesServiceImport.modules) {
            serviceContent += `\n`;
          }

          serviceContent += generateImportsCodePart(
            responsesServiceImport.files,
          );
          if (responsesServiceImport.files) {
            serviceContent += `\n`;
          }
        }

        serviceContent += "/**\n";
        serviceContent += ` * ${operation.summary || ""}\n`;
        serviceContent += serviceArgumentsJsdoc;
        serviceContent += " */\n";
        if (isAmbiguous) {
          serviceContent += `export async function ${fileName}(${serviceArgumentsFunc}): Promise<ServiceAmbiguousResponse<${responsesServiceTypesCodePart}, ${responseCodesTypeCodePart}${responseServiceContentTypesTypeCodePart}>> {\n`;
        } else {
          serviceContent += `export async function ${fileName}(${serviceArgumentsFunc}): Promise<${responsesServiceTypesCodePart}> {\n`;
        }

        serviceContent += `  // This stub is generated if this file doesn't exist.\n`;
        serviceContent += `  // You can change body of this function, but it should comply with controllers' call.\n\n`;
        serviceContent += `  console.log("${fileName}", ${serviceArgumentsCallSrv});\n\n`;

        const codeData = responsesServiceTypesCodePart.includes("[]")
          ? "[]"
          : responsesServiceTypesCodePart !== "unknown"
            ? "{}"
            : "null";
        if (isAmbiguous) {
          serviceContent += `  return { code: ${responseCodes[0]}, data: ${codeData}, type: ${responseContentTypes[0] ? '"' + responseContentTypes[0] + '"' : "undefined"} };\n`;
        } else {
          serviceContent += `  return ${codeData};\n`;
        }
        serviceContent += `}\n`;

        await fs.writeFile(
          serviceFile,
          await prettier.format(serviceContent, {
            parser: "typescript",
            plugins: prettierPlugins,
          }),
        );
      } else {
        console.log("Service file already exists", serviceFile);
      }

      controllerContent += `\n`;
      controllerContent += `/**\n`;
      controllerContent += ` * ${operation.summary || ""}\n`;
      controllerContent += ` * @param req\n`;
      controllerContent += ` * @param res\n`;
      controllerContent += ` */\n`;
      controllerContent += `export default async function (req: Request<${getModelData(fileModelData?.params)}, ${"unknown"}, ${getModelData(fileModelData?.request)}, ${getModelData(fileModelData?.query)}>, res: Response<${responsesTypesCodePart}>) {\n`;
      controllerContent += `  try {\n`;
      if (isAmbiguous) {
        controllerContent += `    const result: ServiceAmbiguousResponse<${responsesServiceTypesCodePart}, ${responseCodesTypeCodePart}${responseServiceContentTypesTypeCodePart}> = await ${fileName}(${serviceArgumentsCallCnt});\n`;

        if (responseContentTypes.length > 1) {
          controllerContent += `    switch (result.type) {\n`;
          responseContentTypes.forEach((responseContentType) => {
            controllerContent += `      case "${responseContentType}":\n`;
            if (contentTypesExpressMapping[responseContentType]) {
              controllerContent += `        res.status(result.code).${contentTypesExpressMapping[responseContentType]}(result.data);\n`;
            } else {
              controllerContent += `        res.status(result.code).contentType("${responseContentType}").send(result.data);\n`;
            }
            controllerContent += `        break;\n`;
          });
          controllerContent += `    }\n`;
        } else if (responseContentTypes.length === 1) {
          if (contentTypesExpressMapping[responseContentTypes[0]]) {
            controllerContent += `    res.status(result.code).${contentTypesExpressMapping[responseContentTypes[0]]}(result.data);\n`;
          } else {
            controllerContent += `    res.status(result.code).contentType("${responseContentTypes[0]}").send(result.data);\n`;
          }
        }
      } else {
        controllerContent += `    const result: ${responsesServiceTypesCodePart} = await ${fileName}(${serviceArgumentsCallCnt});\n`;
        switch (responseServiceContentTypesTypeCodePart) {
          case "application/json":
            controllerContent += `    res.status(${responseCodesTypeCodePart}).json(result);\n`;
            break;
          case "application/xml":
            controllerContent += `    res.status(${responseCodesTypeCodePart}).xml(result);\n`;
            break;
          default:
            controllerContent += `    res.status(${responseCodesTypeCodePart}).send(result);\n`;
        }
      }

      controllerContent += `  } catch (error) {\n`;
      controllerContent += `    console.error(error);\n`;
      if (responseErrorContentTypes) {
        const responseErrorContentType = responseErrorContentTypes[0];
        if (contentTypesExpressMapping[responseErrorContentType]) {
          controllerContent += `    res.status(500).${contentTypesExpressMapping[responseErrorContentType]}({ error: true });\n`;
        } else {
          controllerContent += `    res.status(500).contentType("${responseErrorContentType}").send("Error");\n`;
        }
      } else {
        controllerContent += `    res.status(500);\n`;
      }
      controllerContent += `  }\n`;
      controllerContent += `}\n`;
      await fs.writeFile(
        controllerFile,
        await prettier.format(controllerContent, {
          parser: "typescript",
          plugins: prettierPlugins,
        }),
      );
    },
  );

  await fs.writeFile(
    routesFile,
    await prettier.format(
      `import express from 'express';

${generateImportsCodePart(routesImports.modules)}
${generateImportsCodePart(routesImports.files)}
const router = express.Router();

${routesFunctions}
export default router;
`,
      { parser: "typescript", plugins: prettierPlugins },
    ),
  );
}
