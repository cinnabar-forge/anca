import fs from "fs";
import path from "path";

import { AncaDevelopment, AncaDevelopmentState } from "../schema.js";

const RELEASE_NODEJS = `name: Release

on:
  release:
    types: [created]

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    name: "Publish package to npm registry"
    steps:
      - uses: actions/checkout@v4
        name: "Checkout repo"
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org/
        name: "Install Node.js"
      - run: npm ci
        name: "Install dependencies"
      - run: npm test
        name: "Run tests"
      - run: npm run build
        name: "Build distribution bundle"
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{secrets.npm_token}}
        name: "Publish to registry"
`;

const RELEASE_NODEJS_APP = `name: Release

on:
  release:
    types: [created]

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    name: "Publish package to npm registry"
    steps:
      - uses: actions/checkout@v4
        name: "Checkout repo"
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org/
        name: "Install Node.js"
      - run: npm ci
        name: "Install dependencies"
      - run: npm test
        name: "Run tests"
      - run: npm run build
        name: "Build distribution bundle"
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{secrets.npm_token}}
        name: "Publish to registry"
  build-executables:
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    name: Build executables on \${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
        name: Checkout repo
      - uses: actions/setup-node@v4
        with:
          node-version: 22
        name: Install Node.js
      - run: npm ci
        name: Install dependencies
      - run: npm run build:sea
        name: Build executables
      - run: |
          EXT=""
          if [ "\${{ matrix.os }}" == "windows-latest" ]; then
            EXT=".exe"
          fi
          mv build/sea/app\${EXT} build/sea/\${{ github.event.repository.name }}-\${{ github.ref_name }}-\${{ runner.arch }}\${EXT}
        shell: bash
        name: Rename executable
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            build/sea/\${{ github.event.repository.name }}-\${{ github.ref_name }}-\${{ runner.arch }}\${{ matrix.os == 'windows-latest' && '.exe' || '' }}
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        name: Attach executables to release
`;

const TEST_NODEJS = `name: Test

on:
  push:
    branches: ["**"]

jobs:
  test-commit:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    name: Test repo on Node.js \${{ matrix.node }}
    steps:
      - uses: actions/checkout@v4
        name: "Checkout repo"
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          registry-url: https://registry.npmjs.org/
        name: "Install Node.js"
      - run: npm ci
        name: "Install dependencies"
      - run: npm test
        name: "Run tests"
`;

/**
 *
 * @param fullPath
 */
async function createGithubActionsFolders(fullPath: string) {
  await fs.promises.mkdir(path.join(fullPath, ".github", "workflows"), {
    recursive: true,
  });
}

/**
 *
 * @param state
 * @param contents
 */
export function checkGithubActionsRelease(
  state: AncaDevelopmentState,
  contents: string,
) {
  return (
    contents ===
    (state.config.type === "app" ? RELEASE_NODEJS_APP : RELEASE_NODEJS)
  );
}

/**
 *
 * @param contents
 */
export function checkGithubActionsTest(contents: string) {
  return contents === TEST_NODEJS;
}

/**
 *
 * @param development
 */
export async function checkGithubActionsOtherFiles(
  development: AncaDevelopment,
) {
  await createGithubActionsFolders(development.fullPath);
  const files = fs.readdirSync(
    path.join(development.fullPath, ".github", "workflows"),
  );
  return (
    files.filter((file) => file !== "release.yml" && file !== "test.yml")
      .length === 0
  );
}

/**
 *
 * @param development
 * @param state
 */
export async function fixGithubActionsRelease(
  development: AncaDevelopment,
  state: AncaDevelopmentState,
) {
  await createGithubActionsFolders(development.fullPath);
  fs.writeFileSync(
    path.join(development.fullPath, ".github/workflows/release.yml"),
    state.config.type === "app" ? RELEASE_NODEJS_APP : RELEASE_NODEJS,
  );
}

/**
 *
 * @param development
 */
export async function fixGithubActionsTest(development: AncaDevelopment) {
  await createGithubActionsFolders(development.fullPath);
  fs.writeFileSync(
    path.join(development.fullPath, ".github/workflows/test.yml"),
    TEST_NODEJS,
  );
}

/**
 *
 * @param development
 */
export async function fixGithubActionsOtherFiles(development: AncaDevelopment) {
  await createGithubActionsFolders(development.fullPath);
  const files = fs.readdirSync(
    path.join(development.fullPath, ".github", "workflows"),
  );
  files.forEach(async (file) => {
    if (file !== "release.yml" && file !== "test.yml") {
      fs.rmSync(path.join(development.fullPath, ".github", "workflows", file));
    }
  });
}
