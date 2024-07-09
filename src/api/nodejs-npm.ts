const NPM_PACKAGES_PREDEFINED_VERSIONS: Record<string, string> = {
  "@cinnabar-forge/eslint-plugin": "0.6.0",
  "@cinnabar-forge/meta": "0.1.2",
  "@types/chai": "4.3.16",
  "@types/mocha": "10.0.7",
  "@types/node": "20.14.8",
  "@types/sinon": "17.0.3",
  chai: "5.1.1",
  esbuild: "0.21.5",
  mocha: "10.5.1",
  "pre-commit": "1.2.2",
  sinon: "18.0.0",
  "tsc-watch": "6.2.0",
  tsup: "8.1.0",
  typescript: "5.5.2",
};

/**
 *
 * @param packageName
 */
export function fetchNpmPackageVersion(packageName: string): string {
  return NPM_PACKAGES_PREDEFINED_VERSIONS[packageName];
}
