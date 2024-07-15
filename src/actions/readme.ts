import { AncaDevelopment, AncaReadmeUsageSection } from "../schema.js";
import { writeFolderFile } from "../utils.js";
import { NodejsPackageJson } from "./nodejs.js";

const FILE_PATH = "README.md";

/**
 *
 * @param development
 */
function getContents(development: AncaDevelopment) {
  if (development.state == null) {
    return "";
  }

  const lines = [];

  lines.push(`# ${development.state.meta?.name}`);

  if (development.state.meta?.version?.isUnstable) {
    lines.push(
      `> **DISCLAIMER**: This project is not production ready. All versions below 1.0.0 should be considered unstable`,
    );
  }

  if (development.state.meta?.description) {
    lines.push(`${development.state.meta.description}`);
  }

  if (development.state.config.development?.readme?.description) {
    lines.push(...development.state.config.development.readme.description);
  }

  if (development.state.config.development?.readme?.features) {
    lines.push(`## Features`);
    development.state.config.development.readme.features.forEach((feature) => {
      lines.push(`- ${feature}`);
    });
  }

  lines.push(`## Installation`);

  if (
    development.state.config.stack === "nodejs" &&
    development.state.jsonFiles["package.json"] != null
  ) {
    const packageJson: NodejsPackageJson =
      development.state.jsonFiles["package.json"];
    const binName = development.state.meta?.name;
    const packageName = packageJson.name ?? "app";

    if (development.state.config.type === "app") {
      lines.push(`### Binary`);
      lines.push(
        `[Get the latest binaries](https://example.com/github/user/app-name/releases/latest).`,
      );
      lines.push(
        `If you want to use the app with a command line, rename it to \`${binName}\` or \`${binName}.exe\` and add the location to \`PATH\`.`,
      );
    }

    lines.push(`### npm`);
    if (development.state.config.type === "app") {
      lines.push(`\`\`\`bash\nnpm install -g ${packageName}\n\`\`\``);
    } else {
      lines.push(`\`\`\`bash\nnpm install ${packageName}\n\`\`\``);
    }
  }

  if (development.state.config.development?.readme?.usage) {
    lines.push(`## Usage`);

    const generateUsageSection = (
      sections: AncaReadmeUsageSection[],
      level: number,
    ) => {
      sections.forEach((section) => {
        if (section.name != null) {
          lines.push(`${"#".repeat(level)} ${section.name}`);
        }
        if (section.description) {
          lines.push(`${section.description}`);
        }
        if (section.language && section.code) {
          lines.push(
            `\`\`\`${section.language}\n${section.code.join("\n")}\n\`\`\``,
          );
        }
        if (section.sections) {
          generateUsageSection(section.sections, level + 1);
        }
      });
    };

    generateUsageSection(development.state.config.development.readme.usage, 3);
  }

  lines.push(`## Contributing`);
  lines.push(`Visit [\`CONTRIBUTING.md\`](CONTRIBUTING.md).`);

  if (development.state.config.authors) {
    const maintainers = development.state.config.authors.filter(
      (author) => author.type === "maintainer",
    );
    if (maintainers.length > 0) {
      lines.push(`Current maintainers:`);
      maintainers.forEach((maintainer) => {
        let maintainerLine: string;
        if (maintainer.github) {
          maintainerLine = ` - ${maintainer.name} ([@${maintainer.github}](https://github.com/${maintainer.github}))`;
        } else if (maintainer.url) {
          maintainerLine = ` - [${maintainer.name}](${maintainer.url})`;
        } else if (maintainer.email) {
          maintainerLine = ` - [${maintainer.name}](mailto:${maintainer.email})`;
        } else {
          maintainerLine = `- ${maintainer.name}`;
        }
        if (maintainer.text != null) {
          maintainerLine += ` - ${maintainer.text}`;
        }
        lines.push(maintainerLine);
      });
    }
  }

  lines.push(`## License`);
  lines.push(`Visit [\`LICENSE\`](LICENSE).`);

  lines.push(`## Anca`);
  lines.push(
    `This repository is a part of [Anca](https://github.com/cinnabar-forge/anca) standardization project.`,
  );

  return lines.join("\n\n") + "\n";
}

/**
 *
 * @param development
 */
export async function checkReadmeMd(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[FILE_PATH];
  if (contents == null) {
    console.log("No README.md file found");
    return false;
  }

  return contents === getContents(development);
}

/**
 *
 * @param development
 */
export async function fixReadmeMd(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await writeFolderFile(
    development.fullPath,
    FILE_PATH,
    getContents(development),
  );
}
