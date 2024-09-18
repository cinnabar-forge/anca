import fs from "fs";
import path from "path";

import { AncaDevelopment } from "../schema.js";
import {
  NODEJS_18_VERSION,
  NODEJS_20_VERSION,
  NODEJS_22_VERSION,
} from "./utils/variables.js";

const NAME_RELEASE = `name: Release`;
const NAME_TEST = `name: Test`;

const ON_RELEASE = `on:
  release:
    types: [created]`;

const ON_PUSH = `on:
  push:
    branches: ["**"]`;

const JOBS = `jobs:`;

const JOBS_PUBLISH_NPM = `  publish-npm:
    runs-on: ubuntu-latest
    env:
      ANCA_CI: true
    name: "Publish package to npm registry"
    steps:
      - uses: actions/checkout@v4
        name: "Checkout repo"
      - uses: actions/setup-node@v4
        with:
          node-version: ${NODEJS_22_VERSION}
          registry-url: https://registry.npmjs.org/
        name: "Install Node.js"
      - run: npm ci
        name: "Install dependencies"
      - run: npm test
        name: "Run tests"
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{secrets.npm_token}}
        name: "Build distribution bundle and publish to registry"`;

const JOBS_BUILD_BUNDLE = `  build-bundle:
    permissions: write-all
    runs-on: ubuntu-latest
    env:
      ANCA_CI: true
    name: Build bundle
    steps:
      - uses: actions/checkout@v4
        name: Checkout repo
      - uses: actions/setup-node@v4
        with:
          node-version: ${NODEJS_22_VERSION}
        name: Install Node.js
      - run: npm ci
        name: Install dependencies
      - run: npm run build:bundle
        name: Build bundle
      - run: |
          mv build/bundle/index.js build/bundle/\${{ github.event.repository.name }}-\${{ github.ref_name }}.js
        shell: bash
        name: Rename bundle
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            build/bundle/\${{ github.event.repository.name }}-\${{ github.ref_name }}.js
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        name: Attach bundle to release`;

const JOBS_BUILD_EXECUTABLES = `  build-executables:
    permissions: write-all
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    env:
      ANCA_CI: true
    name: Build executables on \${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
        name: Checkout repo
      - uses: actions/setup-node@v4
        with:
          node-version: ${NODEJS_22_VERSION}
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
        name: Attach executables to release`;

const JOBS_TEST_COMMIT = `  test-commit:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [${NODEJS_18_VERSION}, ${NODEJS_20_VERSION}, ${NODEJS_22_VERSION}]
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
        name: "Run tests"`;

const RELEASE_NODEJS_BEGIN = `${NAME_RELEASE}

${ON_RELEASE}

${JOBS}
`;

const TEST_NODEJS = `${NAME_TEST}

${ON_PUSH}

${JOBS}
${JOBS_TEST_COMMIT}
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
function getReleaseContents(development: AncaDevelopment) {
  let contents = RELEASE_NODEJS_BEGIN;

  if (development.state?.config.public) {
    contents += JOBS_PUBLISH_NPM;
    contents += "\n";
  }

  contents += JOBS_BUILD_BUNDLE;
  contents += "\n";

  if (development.state?.config.type === "app") {
    contents += JOBS_BUILD_EXECUTABLES;
    contents += "\n";
  }

  return contents;
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
  return contents === getReleaseContents(development);
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
 * @param _development
 * @param file
 */
function filterGithubActionsFile(_development: AncaDevelopment, file: string) {
  if (file === "test.yml") return false;
  if (file === "release.yml") return false;
  return true;
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

  const test = files.filter((file) => {
    return filterGithubActionsFile(development, file);
  });

  return test.length === 0;
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
    getReleaseContents(development),
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
    if (filterGithubActionsFile(development, file)) {
      fs.rmSync(path.join(development.fullPath, ".github", "workflows", file));
    }
  });
}
