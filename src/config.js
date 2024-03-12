import Ajv from "ajv";
import fs from "fs";
import path from "path";

export function loadAndValidateConfig(configPath) {
  const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
  const schemaPath = path.join(
    scriptDirectory,
    "../schemas/config.schema.json",
  );
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

  return config;
}
