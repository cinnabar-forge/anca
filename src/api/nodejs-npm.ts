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
  const baseUrl = "https://npm-versions.cinnabar.ru/versions";
  const query = `?packages=${packagesName.join(",")}`;
  const url = `${baseUrl}${query}`;

  console.log("Requesting from Cinnabar Forge NPM Cache:", url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as {
      response: Record<string, string>;
    };
    return data.response;
  } catch (error) {
    console.error("Error fetching package versions:", error);
  }
  return {};
}
