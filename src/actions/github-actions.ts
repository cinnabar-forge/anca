import fs from "fs";
import path from "path";

import { AncaDevelopment } from "../schema.js";

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
    permissions: write-all
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

const RELEASE_FILE_PATH = ".github/workflows/release.yml";
const TEST_FILE_PATH = ".github/workflows/test.yml";

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
 * @param development
 */
export async function checkGithubActionsRelease(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[RELEASE_FILE_PATH];
  if (contents == null) {
    return false;
  }
  return (
    contents ===
    (development.state.config.type === "app"
      ? RELEASE_NODEJS_APP
      : RELEASE_NODEJS)
  );
}

/**
 *
 * @param development
 */
export async function checkGithubActionsTest(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  const contents = development.state.files[TEST_FILE_PATH];
  if (contents == null) {
    return false;
  }
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
 */
export async function fixGithubActionsRelease(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await createGithubActionsFolders(development.fullPath);
  fs.writeFileSync(
    path.join(development.fullPath, ".github/workflows/release.yml"),
    development.state.config.type === "app"
      ? RELEASE_NODEJS_APP
      : RELEASE_NODEJS,
  );
}

/**
 *
 * @param development
 */
export async function fixGithubActionsTest(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
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
  if (development.state == null) {
    return;
  }
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
