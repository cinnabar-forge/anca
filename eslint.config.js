import cinnabarPlugin from "@cinnabar-forge/eslint-plugin";

export default [
  ...cinnabarPlugin.default.map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
  })),
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-type": "off",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-object-injection": "off",
    },
  },
  {
    ignores: ["bin/**/*", "build/**/*", "dist/**/*"],
  },
];
