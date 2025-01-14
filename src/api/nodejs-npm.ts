import fetch from "node-fetch";

/**
 * Predefined versions for npm packages
 * @param packagesName
 */
export async function fetchNpmPackagesVersion(
  packagesName: string[],
): Promise<Record<string, string>> {
  if (packagesName.length === 0) {
    return {};
  }

  const records: Record<string, string> = {};

  for (const packageName of packagesName) {
    const url = `https://registry.npmjs.org/${packageName}/latest/`;
    console.log("Requesting from NPM Registry:", url);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as {
        version: string;
      };
      records[packageName] = data.version;
    } catch (error) {
      console.error(`Error fetching package ${packageName} version:`, error);
    }
  }

  return records;
}
