import cinnabarPlugin from "@cinnabar-forge/eslint-plugin";

export default [
  ...cinnabarPlugin.default,
  {
    ignores: ["src/cinnabar.js", "build/*", "dist/*", "bin/*"]
  }
];
