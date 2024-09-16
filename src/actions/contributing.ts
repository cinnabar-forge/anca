import { AncaConfigAuthor, AncaDevelopment } from "../schema.js";
import { formatAuthorLine, writeFolderFile } from "../utils.js";

const COMMON_PART = `# Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, feel free to open an issue or create a pull request.

## Installation

We support [Devcontainers](https://containers.dev/). You can use the provided development container to work on this project. The development container includes all the necessary tools and dependencies to work on this project.`;

const NODE_JS_PART = `Otherwise, download, install and configure [Node.js](https://nodejs.org/en/download/).

Then, run the following commands to install the dependencies and run the tests:

\`\`\`bash
npm ci
npm test
\`\`\``;

const FILE_PATH = "CONTRIBUTING.md";

/**
 *
 * @param development
 */
function getContents(development: AncaDevelopment) {
  if (development.state == null) {
    return "";
  }

  const lines = [COMMON_PART];

  if (development.state.config.stack === "nodejs") {
    lines.push(NODE_JS_PART);
  }

  if (development.state.config.authors) {
    lines.push(`## Authors`);

    const groupedAuthors: Record<string, AncaConfigAuthor[]> = {
      authors: [],
      contributors: [],
      maintainers: [],
      specials: [],
    };

    development.state.config.authors.forEach((author) => {
      if (author.type === "author") {
        groupedAuthors.authors.push(author);
      } else if (author.type === "maintainer") {
        groupedAuthors.maintainers.push(author);
      } else if (author.type === "contributor") {
        groupedAuthors.contributors.push(author);
      } else {
        groupedAuthors.specials.push(author);
      }
    });

    Object.keys(groupedAuthors).forEach((key) => {
      groupedAuthors[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    if (groupedAuthors.authors.length > 0) {
      groupedAuthors.authors.forEach((author) => {
        lines.push(formatAuthorLine(author));
      });
    }

    if (groupedAuthors.maintainers.length > 0) {
      lines.push(`### Maintainers`);
      groupedAuthors.maintainers.forEach((author) => {
        lines.push(formatAuthorLine(author));
      });
    }

    if (groupedAuthors.contributors.length > 0) {
      lines.push(`### Contributors`);
      groupedAuthors.contributors.forEach((author) => {
        lines.push(formatAuthorLine(author));
      });
    }

    if (groupedAuthors.specials.length > 0) {
      lines.push(`### Special Thanks`);
      groupedAuthors.specials.forEach((author) => {
        lines.push(formatAuthorLine(author));
      });
    }
  }

  return lines.join("\n\n") + "\n";
}

/**
 *
 * @param development
 */
export async function checkContributingMd(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  if (contents == null) {
    return false;
  }

  return contents === getContents(development);
}

/**
 *
 * @param development
 */
export async function fixContributingMd(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    FILE_PATH,
    getContents(development),
  );
}
