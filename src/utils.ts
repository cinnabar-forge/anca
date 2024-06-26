import { CftmBuilder } from "cftm";
import fs from "fs";
import MarkdownIt from "markdown-it";
import path from "path";

/**
 * Checks if file/directory path exists
 * @param filePath
 */
export async function checkExistence(filePath: string) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 *
 * @param jsonPath
 */
export async function readJson(jsonPath: string): Promise<any> {
  try {
    return JSON.parse(await fs.promises.readFile(jsonPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 *
 * @param folder
 * @param jsonPath
 */
export async function readFolderFile(
  folder: string,
  filePath: string,
): Promise<any> {
  try {
    return await fs.promises.readFile(path.resolve(folder, filePath), "utf-8");
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
    await fs.promises.writeFile(path.resolve(folder, filePath), data, "utf-8");
  } catch (error) {
    console.error(
      `Failed to write file at ${path.resolve(folder, filePath)}:`,
      error,
    );
    throw error;
  }
}

/**
 *
 * @param folder
 * @param jsonPath
 */
export async function readFolderJson(
  folder: string,
  jsonPath: string,
): Promise<any> {
  try {
    return JSON.parse(
      await fs.promises.readFile(path.resolve(folder, jsonPath), "utf-8"),
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
export function isSubset(first: any, second: any): boolean {
  for (const key of Object.keys(first)) {
    if (typeof first[key] === "object" && first[key] !== null) {
      if (!isSubset(first[key], second[key])) {
        return false;
      }
    } else {
      if (!(key in second) || first[key] !== second[key]) {
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
  const firstContent = await readJson(firstPath);
  const secondContent = await readJson(secondPath);

  return firstContent && secondContent && isSubset(firstContent, secondContent);
}

/**
 * Compares if second file has all lines from first one
 * @param firstPath
 * @param secondPath
 */
export async function isFileSubset(firstPath: string, secondPath: string) {
  const firstContent = await fs.promises.readFile(firstPath, "utf-8");
  const secondContent = await fs.promises.readFile(secondPath, "utf-8");

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
 * @param markdownItTokens
 */
export async function convertMarkdownItTokenToCinnabarMarkup(
  markdownItTokens: MarkdownIt.Token[],
) {
  const markup = new CftmBuilder();

  let lastTag = "";

  for (const token of markdownItTokens) {
    if (token.type === "inline" && lastTag !== "") {
      console.log(lastTag, token.content);
      // markup.add(lastTag, token.content);
    }
    lastTag = token.tag;
  }

  return markup.build();
}
