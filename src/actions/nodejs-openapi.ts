import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import prettierEstree from "prettier/plugins/estree";
import prettierTypescript from "prettier/plugins/typescript";
import prettier from "prettier/standalone";

import { AncaDevelopment } from "../schema.js";
import {
  capitalize,
  checkExistence,
  getHttpCodeFunctionText,
  IndentationBuilder,
  readFolderJsonFile,
} from "../utils.js";

interface ModelData {
  isArray?: boolean;
  isDefault?: boolean;
  isPrimitive?: boolean;
  isRedirect?: boolean;
  name: string;
  noContent?: boolean;
}

interface ServiceResponseType {
  code?: number[];
  data: string[];
  type?: string[];
}

interface Operation {
  fileName: string;
  params?: ModelData;
  query?: ModelData;
  request?: ModelData;
  responses?: ModelData[];
  serviceResponseTypes?: ServiceResponseType[];
  swagger: any;
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
    ? modelData.isRedirect
      ? "string"
      : modelData.isArray
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

  const modelsRelativeLocation = openapiConfig?.modelsLocation || "./src/types";

  return {
    codePath: openapiConfig?.modelsModule || modelsRelativeLocation,
    filePath: path.join(
      development.monorepoFullPath || development.fullPath,
      modelsRelativeLocation,
    ),
    isFile: openapiConfig?.modelsLocation
      ? openapiConfig?.modelsLocationType === "file"
      : false,
    isModule: openapiConfig?.externalModule ? true : false,
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
 * @param responseStatusNumber
 */
function isCodeRedirect(responseStatusNumber: number) {
  return responseStatusNumber >= 300 && responseStatusNumber < 400;
}

/**
 *
 * @param type
 * @param responsesServiceTypesCodePart
 */
function getContentTypeResponse(
  type: string,
  responsesServiceTypesCodePart: string,
) {
  if (type === "application/json") {
    return responsesServiceTypesCodePart.includes("[]") ? [] : {};
  } else if (type === "application/xml") {
    return "<xml></xml>";
  } else if (type === "text/html") {
    return "<html></html>";
  }
  return null;
}

/**
 *
 * @param development
 */
async function generateTypeScriptAncaTypes(development: AncaDevelopment) {
  const modelsLocation = path.resolve(development.fullPath, "./src/types");

  console.log(
    "generateTypeScriptEssentialModels",
    "modelsLocation",
    modelsLocation,
  );

  await fs.writeFile(
    path.join(modelsLocation, "anca.ts"),
    await prettier.format(
      `export interface ServiceResponse<D, S = undefined, T = undefined> {
  code: S;
  data?: D;
  type?: T;
  error?: string;
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
async function processPaths(development: AncaDevelopment, openapi: any) {
  const modelsLocation = getDevelopmentModelsPath(development);

  console.log("\n", "PROCESS PATHS");

  if (!modelsLocation.isFile) {
    fs.mkdir(modelsLocation.filePath, { recursive: true });
  }

  const schemaComponents = openapi.components?.schemas || {};
  const models: Record<string, string> = {};
  const operations: Record<string, Operation> = {};

  const pathsMethods: {
    apiPath: string;
    fileName: string;
    functionName: string;
    isAmbiguous: boolean;
    isRedirect: boolean;
    method: string;
    operation: any;
    operationParsed: Operation;
    responseCodes: number[];
    responseContentTypes: string[];
    responseErrorContentTypes?: string[];
    serviceResponseTypes: ServiceResponseType[];
  }[] = [];

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
  ): {
    isArray?: boolean;
    isPrimitive?: boolean;
    isRef?: boolean;
    name?: string;
  } {
    if (schema.$ref) {
      const refParts = schema.$ref.split("/");
      console.log("ref", refParts);
      return { isRef: true, name: refParts[refParts.length - 1] };
    }
    if (schema.type === "array" && schema.items && schema.items.$ref) {
      const refParts = schema.items.$ref.split("/");
      console.log("ref in array", refParts);
      return {
        isArray: true,
        isRef: true,
        name: refParts[refParts.length - 1],
      };
    }
    if (schema.type === "object") {
      const name = fallbackName || `Generic${count++}`;
      console.log("object", name);
      if (processSchema(schema, name)) {
        return { name };
      }
    }
    const propertyType = getPropertyType(schema);
    if (propertyType) {
      return { isPrimitive: true, name: propertyType };
    }
    console.log("no schema, only", schema?.type);
    return {};
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

        const requestBody = operation.requestBody;
        const parameters = operation.parameters;
        const responses = operation.responses;

        const fileName = generateOperationName(
          operation.operationId,
          method,
          apiPath,
        );
        const functionName = `route${capitalize(fileName)}`;

        let redirectCheck = false;

        const responseCodes: Set<number> = new Set<number>();
        const responseContentTypes: Set<string> = new Set<string>();
        const responseErrorContentTypes: Set<string> = new Set<string>();

        if (!operations[fileName]) {
          operations[fileName] = {
            fileName,
            swagger: operation,
          };
        }

        if (requestBody && requestBody.content) {
          Object.keys(requestBody.content).forEach((contentType) => {
            const sanitizedContentType = camelCaseText(contentType, true);
            const processedSchema = processReferableSchema(
              requestBody.content[contentType].schema,
              capitalize(fileName + sanitizedContentType + "Request"),
            );
            console.log("requestBody", processedSchema);
            if (processedSchema.name) {
              operations[fileName].request = {
                isArray: processedSchema.isArray,
                isPrimitive: processedSchema.isPrimitive,
                name: processedSchema.name,
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
            operations[fileName].params = { name: paramsModel };
          }
          if (processSchema(schemaQuery, queryModel)) {
            operations[fileName].query = { name: queryModel };
          }
        }

        if (responses) {
          console.log("responses");
          Object.keys(responses).forEach((responseStatus) => {
            const response = responses[responseStatus];

            const responseStatusNumber = parseInt(responseStatus) || null;
            if (!responseStatusNumber) {
              if (response.content) {
                Object.keys(response.content).forEach((contentType) => {
                  responseErrorContentTypes.add(contentType);
                });
              }
              return;
            }
            if (isCodeRedirect(responseStatusNumber)) {
              redirectCheck = true;
            }
            responseCodes.add(responseStatusNumber);
            if (response.content) {
              Object.keys(response.content).forEach((contentType) => {
                responseContentTypes.add(contentType);
              });
            }

            if (response.content) {
              Object.keys(response.content).forEach((contentType) => {
                const sanitizedContentType = camelCaseText(contentType, true);
                const processedSchema = processReferableSchema(
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
                console.log("responseModel", responseStatus, processedSchema);
                if (processedSchema.name) {
                  if (operations[fileName].responses == null) {
                    operations[fileName].responses = [];
                  }
                  const responseStatusNumber = parseInt(responseStatus) || 200;
                  operations[fileName].responses.push({
                    isArray: processedSchema.isArray,
                    isDefault: responseStatus === "default",
                    isPrimitive: processedSchema.isPrimitive,
                    isRedirect: isCodeRedirect(responseStatusNumber),
                    name: processedSchema.name,
                  });
                }
              });
            } else {
              const name = capitalize(
                fileName +
                  (responseStatus
                    ? getHttpCodeFunctionText(responseStatus)
                    : responseStatus) +
                  "Response",
              );
              if (operations[fileName].responses == null) {
                operations[fileName].responses = [];
              }
              const responseStatusNumber = parseInt(responseStatus) || 200;
              operations[fileName].responses.push({
                isArray: false,
                isDefault: responseStatus === "default",
                isRedirect: isCodeRedirect(responseStatusNumber),
                name,
                noContent: true,
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

        console.log("redirectCheck", redirectCheck);
        console.log("responseCodesArray", responseCodesArray);
        console.log("responseContentTypesArray", responseContentTypesArray);
        console.log(
          "responseErrorContentTypesArray",
          responseErrorContentTypesArray,
        );

        pathsMethods.push({
          apiPath,
          fileName,
          functionName,
          isAmbiguous:
            responseCodesArray.length > 1 ||
            responseContentTypesArray.length > 1,
          isRedirect: redirectCheck,
          method,
          operation,
          operationParsed: operations[fileName],
          responseCodes: responseCodesArray,
          responseContentTypes: responseContentTypesArray,
          responseErrorContentTypes: responseErrorContentTypesArray,
          serviceResponseTypes: [],
        });

        console.log("modelsByFile", fileName, operations[fileName]);
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

  return { pathsMethods };
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
    return `${getPropertyType(propertySchema.items)}[]`;
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

  const controllersDir = path.join(development.fullPath, "src", "controllers");
  const servicesDir = path.join(development.fullPath, "src", "services");
  const routesFile = path.join(development.fullPath, "src", "routes.ts");
  const typesDir = path.join(development.fullPath, "src", "types");

  fs.mkdir(controllersDir, { recursive: true });
  fs.mkdir(servicesDir, { recursive: true });
  fs.mkdir(typesDir, { recursive: true });

  await generateTypeScriptAncaTypes(development);

  const { pathsMethods } = await processPaths(development, openapi);

  const routesImports: Imports = {};
  let routesAuth = false;
  let routesFunctions = "";

  console.log("\nprocessing paths\n");

  pathsMethods.sort((a, b) => a.fileName.localeCompare(b.fileName));

  pathsMethods.forEach(
    async ({
      apiPath,
      fileName,
      functionName,
      isAmbiguous,
      isRedirect,
      method,
      operation,
      operationParsed,
      responseCodes,
      responseContentTypes,
      responseErrorContentTypes,
    }) => {
      addImport(routesImports, `./controllers/${fileName}.js`, functionName, {
        isDefault: true,
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

      const controllerFile = path.join(controllersDir, `${fileName}.ts`);
      const serviceFile = path.join(servicesDir, `${fileName}.ts`);

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
          "ServiceResponse",
        );
        addImport(
          responsesServiceImport,
          "../types/anca.js",
          "ServiceResponse",
        );
      }

      operationParsed?.responses
        ?.filter((value) => !value.noContent && !value.isPrimitive)
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
      operationParsed?.responses
        ?.filter(
          (value) =>
            value.isDefault !== true && !value.noContent && !value.isPrimitive,
        )
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
        operationParsed?.responses
          ?.filter((value) => !value.noContent)
          ?.map(getModelData)
          .filter(filterDuplicates)
          .sort()
          .join(" | ") || (isRedirect ? "string" : "null");
      const responsesServiceTypesCodePart =
        operationParsed?.responses
          ?.filter((value) => value.isDefault !== true && !value.noContent)
          .map(getModelData)
          .filter(filterDuplicates)
          .sort()
          .join(" | ") || (isRedirect ? "string" : "null");

      let serviceArgumentsFunc = "";
      let serviceArgumentsCallCnt = "";
      let serviceArgumentsCallSrv = "";
      const serviceArgumentsJsdoc = new IndentationBuilder();

      const controllerContent = new IndentationBuilder();

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

      if (operationParsed?.request) {
        const modelPath = getCodeModelPath(
          development,
          operationParsed.request.name,
        );
        addImport(
          responsesControllerImport,
          modelPath.path,
          operationParsed.request.name,
          { isModule: modelPath.isModule },
        );
        addImport(
          responsesServiceImport,
          modelPath.path,
          operationParsed.request.name,
          { isModule: modelPath.isModule },
        );

        serviceArgumentsFunc += `request: ${operationParsed.request.name}`;
        serviceArgumentsJsdoc.line(` * @param request`);
        serviceArgumentsCallSrv += `request`;
        serviceArgumentsCallCnt += `req.body`;
      }
      if (operationParsed?.params) {
        const modelPath = getCodeModelPath(
          development,
          operationParsed.params.name,
        );
        addImport(
          responsesControllerImport,
          modelPath.path,
          operationParsed.params.name,
          { isModule: modelPath.isModule },
        );
        addImport(
          responsesServiceImport,
          modelPath.path,
          operationParsed.params.name,
          { isModule: modelPath.isModule },
        );
        serviceArgumentsFunc += `${serviceArgumentsFunc ? ", " : ""}params: ${operationParsed.params.name}`;
        serviceArgumentsJsdoc.line(` * @param params`);
        serviceArgumentsCallSrv += `${serviceArgumentsCallSrv ? ", " : ""}params`;
        serviceArgumentsCallCnt += `${serviceArgumentsCallCnt ? ", " : ""}req.params`;
      }
      if (operationParsed?.query) {
        const modelPath = getCodeModelPath(
          development,
          operationParsed.query.name,
        );
        addImport(
          responsesControllerImport,
          modelPath.path,
          operationParsed.query.name,
          { isModule: modelPath.isModule },
        );
        addImport(
          responsesServiceImport,
          modelPath.path,
          operationParsed.query.name,
          { isModule: modelPath.isModule },
        );
        serviceArgumentsFunc += `${serviceArgumentsFunc ? ", " : ""}query: ${operationParsed.query.name}`;
        serviceArgumentsJsdoc.line(` * @param query`);
        serviceArgumentsCallSrv += `${serviceArgumentsCallSrv ? ", " : ""}query`;
        serviceArgumentsCallCnt += `${serviceArgumentsCallCnt ? ", " : ""}req.query`;
      }

      if (responsesControllerImport) {
        controllerContent.line(
          generateImportsCodePart(responsesControllerImport.modules),
        );
        controllerContent.newline();
        controllerContent.line(
          generateImportsCodePart(responsesControllerImport.files),
        );
      }

      if (!(await checkExistence(serviceFile))) {
        const serviceContent = new IndentationBuilder();

        if (responsesServiceImport) {
          serviceContent.line(
            generateImportsCodePart(responsesServiceImport.modules),
          );
          if (responsesServiceImport.modules) {
            serviceContent.newline();
          }

          serviceContent.line(
            generateImportsCodePart(responsesServiceImport.files),
          );
          if (responsesServiceImport.files) {
            serviceContent.newline();
          }
        }

        serviceContent.line("/**");
        serviceContent.line(` * ${operation.summary || ""}`);
        if (!serviceArgumentsJsdoc.isEmpty()) {
          serviceContent.line(serviceArgumentsJsdoc.toString());
        }
        serviceContent.line(" */");
        if (isAmbiguous) {
          serviceContent.line(
            `export async function ${fileName}(${serviceArgumentsFunc}): Promise<ServiceResponse<${responsesServiceTypesCodePart}, ${responseCodesTypeCodePart}${responseServiceContentTypesTypeCodePart}>> {`,
          );
        } else {
          serviceContent.line(
            `export async function ${fileName}(${serviceArgumentsFunc}): Promise<${responsesServiceTypesCodePart}> {`,
          );
        }

        serviceContent.up();
        serviceContent.line(
          `// This stub is generated if this file doesn't exist.`,
        );
        serviceContent.line(
          `// You can change body of this function, but it should comply with controllers' call.`,
        );
        serviceContent.newline();
        serviceContent.line(
          `console.log("${fileName}", ${serviceArgumentsCallSrv});`,
        );
        serviceContent.newline();

        if (isAmbiguous) {
          const responseObject: any = {};
          if (responseCodes && responseCodes[0]) {
            responseObject.code = responseCodes[0];
            responseObject.data = isCodeRedirect(responseCodes[0])
              ? "http://localhost"
              : null;
          }
          if (responseContentTypes && responseContentTypes[0]) {
            responseObject.type = responseContentTypes[0];
            if (responseObject.data == null) {
              responseObject.data = getContentTypeResponse(
                responseContentTypes[0],
                responsesServiceTypesCodePart,
              );
            }
          }
          serviceContent.line(`return ${JSON.stringify(responseObject)};`);
        } else if (isRedirect) {
          serviceContent.line(`return "http://localhost";`);
        } else {
          serviceContent.line(
            `return ${JSON.stringify(getContentTypeResponse(responseContentTypes && responseContentTypes[0], responsesServiceTypesCodePart))};`,
          );
        }
        serviceContent.down();
        serviceContent.line(`}`);

        await fs.writeFile(
          serviceFile,
          await prettier.format(serviceContent.toString(), {
            parser: "typescript",
            plugins: prettierPlugins,
          }),
        );
      } else {
        console.log("Service file already exists", serviceFile);
      }

      controllerContent.line("/**");
      controllerContent.line(` * ${operation.summary || ""}`);
      controllerContent.line(" * @param req");
      controllerContent.line(" * @param res");
      controllerContent.line(" */");
      controllerContent.line(
        `export default async function (req: Request<${getModelData(operationParsed?.params)}, ${"null"}, ${getModelData(operationParsed?.request)}, ${getModelData(operationParsed?.query)}>, res: Response<${responsesTypesCodePart}>) {`,
      );
      controllerContent.up();
      controllerContent.line("try {");
      controllerContent.up();

      if (isAmbiguous) {
        controllerContent.line(
          `const result: ServiceResponse<${responsesServiceTypesCodePart}, ${responseCodesTypeCodePart}${responseServiceContentTypesTypeCodePart}> = await ${fileName}(${serviceArgumentsCallCnt});`,
        );
        if (responseContentTypes.length > 1) {
          controllerContent.line("switch (result.type) {");
          controllerContent.up();
          responseContentTypes.forEach((responseContentType) => {
            controllerContent.line(`case "${responseContentType}":`);
            controllerContent.up();
            if (contentTypesExpressMapping[responseContentType]) {
              controllerContent.line(
                `res.status(result.code).${contentTypesExpressMapping[responseContentType]}(result.data);`,
              );
            } else {
              controllerContent.line(
                `res.status(result.code).contentType("${responseContentType}").send(result.data);`,
              );
            }
            controllerContent.line("break;");
            controllerContent.down();
          });
          controllerContent.down();
          controllerContent.line("}");
        } else if (responseContentTypes.length === 1) {
          if (contentTypesExpressMapping[responseContentTypes[0]]) {
            controllerContent.line(
              `res.status(result.code).${contentTypesExpressMapping[responseContentTypes[0]]}(result.data);`,
            );
          } else {
            controllerContent.line(
              `res.status(result.code).contentType("${responseContentTypes[0]}").send(result.data);`,
            );
          }
        } else if (responseCodes.length > 1) {
          if (responseCodes.length === 1) {
            if (isRedirect) {
              controllerContent.line(`res.redirect(result);`);
            } else {
              controllerContent.line(`res.sendStatus(result.code);`);
            }
          } else {
            const redirectCodes = responseCodes.filter(isCodeRedirect);
            if (redirectCodes.length > 0) {
              controllerContent.line(
                `if ((${redirectCodes
                  .map((code) => `result.code === ${code}`)
                  .join(" || ")}) && result.data != null) {`,
              );
              controllerContent.up();
              controllerContent.line(`res.redirect(result.data);`);
              controllerContent.down();
              controllerContent.line("} else {");
              controllerContent.up();
              controllerContent.line(`res.sendStatus(result.code);`);
              controllerContent.down();
              controllerContent.line("}");
            } else {
              controllerContent.line(`res.sendStatus(result.code);`);
            }
          }
        }
      } else {
        controllerContent.line(
          `const result: ${responsesServiceTypesCodePart} = await ${fileName}(${serviceArgumentsCallCnt});`,
        );
        if (isRedirect) {
          controllerContent.line(`res.redirect(result);`);
        } else if (responseContentTypes[0]) {
          switch (responseContentTypes[0]) {
            case "application/json":
              controllerContent.line(
                `res.status(${responseCodesTypeCodePart}).json(result);`,
              );
              break;
            case "application/xml":
              controllerContent.line(
                `res.status(${responseCodesTypeCodePart}).xml(result);`,
              );
              break;
            default:
              controllerContent.line(
                `res.status(${responseCodesTypeCodePart}).contentType("${responseContentTypes[0]}").send(result);`,
              );
          }
        } else {
          controllerContent.line(
            `res.sendStatus(${responseCodesTypeCodePart});`,
          );
        }
      }

      controllerContent.down();
      controllerContent.line("} catch (error) {");
      controllerContent.up();
      controllerContent.line("console.error(error);");
      if (responseErrorContentTypes) {
        const responseErrorContentType = responseErrorContentTypes[0];
        if (
          responseErrorContentType &&
          contentTypesExpressMapping[responseErrorContentType]
        ) {
          controllerContent.line(
            `res.status(500).${contentTypesExpressMapping[responseErrorContentType]}({ error: true });`,
          );
        } else if (responseErrorContentType) {
          controllerContent.line(
            `res.status(500).contentType("${responseErrorContentType}").send("Error");`,
          );
        } else {
          controllerContent.line("res.sendStatus(500);");
        }
      } else {
        controllerContent.line("res.sendStatus(500);");
      }
      controllerContent.down();
      controllerContent.line("}");
      controllerContent.down();
      controllerContent.line("}");

      await fs.writeFile(
        controllerFile,
        await prettier.format(controllerContent.toString(), {
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
