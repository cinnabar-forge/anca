import Ajv from "ajv";
import fs from "fs";
import path from "path";

export function loadAndValidateConfig(workfolderPath, configPath, schemaPath) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  if (!validate(config)) {
    throw new Error(
      `Configuration validation error: ${validate.errors.map((err) => err.message).join(", ")}`,
    );
  }

  for (const project of config.projects) {
    project.folderPath = path.resolve(
      workfolderPath,
      "projects",
      project.folder,
    );
    project.fullPath = path.resolve(project.folderPath, project.name);
  }

  for (const workspace of config.workspaces) {
    workspace.folderPath = path.resolve(
      workfolderPath,
      "workspaces",
      workspace.folder,
    );
    workspace.fullPath = path.resolve(workspace.folderPath, workspace.name);
  }

  return config;
}
