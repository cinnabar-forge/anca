import fs from "node:fs/promises";
import path from "node:path";
import Ajv, { type AnySchema } from "ajv";

import type { AncaConfigAuthor } from "./schema.js";

const HTTP_CODES: Record<number | string, string> = {
  100: "Continue", // Informational
  101: "SwitchingProtocols",
  102: "Processing",

  200: "Success", // Success
  201: "Created",
  202: "Accepted",
  203: "NonAuthoritativeInformation",
  204: "NoContent",
  205: "ResetContent",
  206: "PartialContent",
  207: "MultiStatus",
  208: "AlreadyReported",
  226: "IMUsed",

  300: "MultipleChoices", // Redirection
  301: "MovedPermanently",
  302: "Found",
  303: "SeeOther",
  304: "NotModified",
  305: "UseProxy",
  306: "SwitchProxy",
  307: "TemporaryRedirect",
  308: "PermanentRedirect",

  400: "BadRequest", // Client Errors
  401: "Unauthorized",
  402: "PaymentRequired",
  403: "Forbidden",
  404: "NotFound",
  405: "MethodNotAllowed",
  406: "NotAcceptable",
  407: "ProxyAuthenticationRequired",
  408: "RequestTimeout",
  409: "Conflict",
  410: "Gone",
  411: "LengthRequired",
  412: "PreconditionFailed",
  413: "PayloadTooLarge",
  414: "URITooLong",
  415: "UnsupportedMediaType",
  416: "RangeNotSatisfiable",
  417: "ExpectationFailed",
  418: "ImATeapot",
  421: "MisdirectedRequest",
  422: "UnprocessableEntity",
  423: "Locked",
  424: "FailedDependency",
  425: "TooEarly",
  426: "UpgradeRequired",
  428: "PreconditionRequired",
  429: "TooManyRequests",
  431: "RequestHeaderFieldsTooLarge",
  451: "UnavailableForLegalReasons",

  500: "InternalServerError", // Server Errors
  501: "NotImplemented",
  502: "BadGateway",
  503: "ServiceUnavailable",
  504: "GatewayTimeout",
  505: "HTTPVersionNotSupported",
  506: "VariantAlsoNegotiates",
  507: "InsufficientStorage",
  508: "LoopDetected",
  510: "NotExtended",
  511: "NetworkAuthenticationRequired",

  default: "Other",
};

/**
 *
 * @param code
 */
export function getHttpCodeFunctionText(code: number | string) {
  return (code && (HTTP_CODES[code] || code.toString())) || false;
}

/**
 * Checks if file/directory path exists
 * @param filePath
 */
export async function checkExistence(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 *
 * @param jsonPath
 */
export async function readJsonFile(jsonPath: string): Promise<null | object> {
  try {
    return JSON.parse(await fs.readFile(jsonPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 *
 * @param folder
 * @param filePath
 */
export async function readFolderFile(
  folder: string,
  filePath: string,
): Promise<null | string> {
  try {
    return await fs.readFile(path.resolve(folder, filePath), "utf-8");
  } catch {
    return null;
  }
}

/**
 * Writes data to a file within a specified folder. If the file does not exist, it will be created.
 * @param folder - The folder where the file will be written.
 * @param filePath - The path of the file within the folder.
 * @param data - The data to write to the file.
 */
export async function writeFolderFile(
  folder: string,
  filePath: string,
  data: string,
): Promise<void> {
  try {
    await fs.writeFile(path.resolve(folder, filePath), data || "", "utf-8");
  } catch (error) {
    console.error(
      `Failed to write file at ${path.resolve(folder, filePath)}:`,
      error,
    );
  }
}

/**
 * Stringifies JSON data with 2 spaces indentation
 * @param data
 */
export function stringifyJson(data: object) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

/**
 * Writes data to a JSON file within a specified folder. If the file does not exist, it will be created.
 * @param folder
 * @param filePath
 * @param data
 */
export async function writeFolderJsonFile(
  folder: string,
  filePath: string,
  data: object,
): Promise<void> {
  try {
    await fs.writeFile(
      path.resolve(folder, filePath),
      stringifyJson(data),
      "utf-8",
    );
  } catch (error) {
    console.error(
      `Failed to write file at ${path.resolve(folder, filePath)}:`,
      error,
    );
  }
}

/**
 *
 * @param folder
 * @param jsonPath
 */
export async function readFolderJsonFile(
  folder: string,
  jsonPath: string,
): Promise<null | object> {
  try {
    return JSON.parse(
      await fs.readFile(path.resolve(folder, jsonPath), "utf-8"),
    );
  } catch {
    return null;
  }
}

/**
 * Compares if second object extends first one
 * @param first
 * @param second
 */

/**
 *
 * @param first
 * @param second
 */
export function isSubset<T extends object>(first: T, second: T): boolean {
  for (const key of Object.keys(first) as Array<keyof T>) {
    const firstValue = first[key];
    const secondValue = second[key];

    if (typeof firstValue === "object" && firstValue !== null) {
      if (!isSubset(firstValue, secondValue as typeof firstValue)) {
        return false;
      }
    } else {
      if (!(key in second) || firstValue !== secondValue) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Compares if second JSON file extends first one
 * @param firstPath
 * @param secondPath
 */
export async function isJsonFileSubset(firstPath: string, secondPath: string) {
  const firstContent = await readJsonFile(firstPath);
  const secondContent = await readJsonFile(secondPath);

  return firstContent && secondContent && isSubset(firstContent, secondContent);
}

/**
 * Compares if second file has all lines from first one
 * @param firstPath
 * @param secondPath
 */
export async function isFileSubset(firstPath: string, secondPath: string) {
  const firstContent = await fs.readFile(firstPath, "utf-8");
  const secondContent = await fs.readFile(secondPath, "utf-8");

  if (firstContent == null || secondContent == null) {
    return null;
  }

  const firstLines = new Set(
    firstContent.split("\n").filter((line) => line.trim()),
  );
  const secondLines = new Set(
    secondContent.split("\n").filter((line) => line.trim()),
  );

  for (const line of firstLines) {
    if (!secondLines.has(line)) {
      return false;
    }
  }
  return true;
}

/**
 *
 * @param schema
 * @param data
 */
export function verifyAjv(schema: AnySchema, data: unknown) {
  const validate = new Ajv().compile(schema);

  if (!validate(data)) {
    throw new Error(
      `Configuration validation error: ${validate.errors?.map((err) => err.message).join(", ")}`,
    );
  }
}

/**
 *
 * @param schema
 * @param data
 */
export function isAjvValid(schema: AnySchema, data: unknown) {
  const validate = new Ajv().compile(schema);
  return validate(data);
}

/**
 *
 * @param str
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format the author line for the Markdown file
 * @param author
 */
export function formatAuthorLine(author: AncaConfigAuthor): string {
  let authorLine = `- ${author.name}`;
  if (author.github) {
    authorLine += ` ([@${author.github}](https://github.com/${author.github}))`;
  } else if (author.url) {
    authorLine += ` — <${author.url}>`;
  } else if (author.email) {
    authorLine += ` — <${author.email}>`;
  }
  if (author.status != null && author.status !== "active") {
    authorLine += ` — ${author.status}`;
  }
  if (author.text) {
    authorLine += ` — ${author.text}`;
  }
  return authorLine;
}

export class IndentationBuilder {
  indentation: number;
  lines: string[];
  size: number;
  tabs: boolean;

  constructor(initialIndentation?: number, size?: number, tabs?: boolean) {
    this.indentation = initialIndentation || 0;
    this.size = size || 0;
    this.tabs = tabs || false;
    this.lines = [];
  }

  down() {
    this.indentation--;
    if (this.indentation < 0) {
      this.indentation = 0;
    }
    return this;
  }

  isEmpty() {
    return this.lines.length === 0;
  }

  line(text: boolean | null | number | string | undefined) {
    this.lines.push("  ".repeat(this.indentation) + text);
  }

  newline() {
    this.lines.push("");
    return this;
  }

  toString() {
    return this.lines.join("\n");
  }

  up() {
    this.indentation++;
    return this;
  }
}
