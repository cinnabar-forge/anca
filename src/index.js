import Ajv from "ajv";
import blessed from "blessed";
import { program } from "commander";
import { readFileSync } from "fs";
import path from "path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);

function loadAndValidateConfig(configPath) {
  const schemaPath = path.join(
    scriptDirectory,
    "../schemas/config.schema.json",
  );
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  if (!validate(config)) {
    throw new Error(
      `Configuration validation error: ${validate.errors.map((err) => err.message).join(", ")}`,
    );
  }

  return config;
}

program
  .version("1.0.0")
  .description(
    "CLI tool for managing and validating project conventions and Git statuses.",
  )
  .requiredOption(
    "-c, --config <path>",
    "Specify the path to the configuration file",
  )
  .option("-w, --workfolder <path>", "Specify the path to the main workfolder");

program.parse(process.argv);
const options = program.opts();

const screen = blessed.screen({
  smartCSR: true,
  title: "Cinnabar Forge Anna",
});

const list = blessed.list({
  border: { type: "line" },
  height: "100%",
  keys: true,
  parent: screen,
  style: {
    selected: { bg: "red", fg: "black" },
  },
  width: "100%",
});

// eslint-disable-next-line no-process-exit
screen.key(["escape", "q", "C-c"], () => process.exit(0));
list.focus();
screen.render();

try {
  const configPath = options.config;
  const config = loadAndValidateConfig(configPath);

  const projects = config.workspaces.map(
    (workspace) => `${workspace.folder} / ${workspace.name}`,
  );
  list.setItems(projects);
  screen.render();

  list.on("select", async (item) => {
    const projectName = item.getContent().split(" / ")[1];
    const workspace = config.workspaces.find((ws) => ws.name === projectName);
    const projectPath = path.join(
      options.workfolder,
      workspace.folder,
      workspace.name,
    );
    item.setText(projectPath)
    screen.render();
  });
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode(1);
}
