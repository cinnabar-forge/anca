import fs from "node:fs";
import path from "node:path";

import type { AncaDevelopment } from "../schema.js";
import {
  NODEJS_18_VERSION,
  NODEJS_20_VERSION,
  NODEJS_22_VERSION,
  NODEJS_23_VERSION,
} from "./utils/variables.js";

const ON_RELEASE = `on:
  release:
    types: [created]`;

const ON_PUSH = `on:
  push:
    branches: ["**"]`;

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
        node: [${NODEJS_18_VERSION}, ${NODEJS_20_VERSION}, ${NODEJS_22_VERSION}, ${NODEJS_23_VERSION}]
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

const JOBS_RUN_CINNABAR_META = `  run-cinnabar-meta:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: \${{ secrets.CINNABAR_META_PAT }}
          fetch-depth: 0
          fetch-tags: true
          submodules: recursive
      - name: Collect pull requests
        id: collect-prs
        uses: actions/github-script@v6
        with:
          script: |
            const { execSync } = require('child_process');
            const latestTag = execSync('git tag --sort=-creatordate | head -n 1').toString().trim();
            console.log(\`Latest tag: \${latestTag}\`);
            const tagCommitDate = execSync(\`git log -1 --format=%ai \${latestTag}\`).toString().trim();
            console.log(\`Latest tag commit date: \${tagCommitDate}\`);
            const { data: pulls } = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'closed',
              base: 'master',
              sort: 'updated',
              direction: 'desc',
            });
            const filteredPRs = pulls.filter(pr => {
              return pr.merged_at && new Date(pr.merged_at) > new Date(tagCommitDate);
            });
            const prList = filteredPRs.map(pr => \`- \${pr.title} (#\${pr.number})\`).join('\\n');
            const fs = require('fs');
            fs.writeFileSync('.cinnabar-meta-pull-requests.md', prList);
            console.log(\`Collected PRs:\\n\${prList}\`);
      - name: Install Cinnabar Meta
        run: npm i -g @cinnabar-forge/meta
      - name: Set up Git user
        run: |
          git config --global user.name \${{ vars.TECHNICAL_USER_NAME }}
          git config --global user.email \${{ vars.TECHNICAL_USER_EMAIL }}
      - name: Run cinnabar-meta command
        run: cinnabar-meta --file
      - name: Push changes and tags
        run: |
          git push origin --atomic HEAD:master --tags
      - name: Read version from ./tmp/version
        id: read-version
        run: |
          VERSION=$(cat ./tmp/version)
          echo "::set-output name=version::$VERSION"
      - name: Create release
        uses: actions/create-release@v1
        with:
          tag_name: v\${{ steps.read-version.outputs.version }}
          release_name: v\${{ steps.read-version.outputs.version }}
          body_path: ./tmp/CHANGELOG-latest.md
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: \${{ secrets.CINNABAR_META_PAT }}`;

const JOBS_CHECK_CINNABAR_META_FILE_EXISTS = `  check-file-exists:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
        with:
          ref: \${{ github.head_ref }}
      - name: Check if update.cinnabarmeta exists
        id: check-file
        run: |
          if [ -f "update.cinnabarmeta" ]; then
            echo "File exists, proceeding..."
          else
            echo "File does not exist, failing the action..."
            exit 1
          fi`;

const RELEASE_NODEJS_BEGIN = `name: Release

${ON_RELEASE}

jobs:
`;

const TEST_NODEJS = `name: Test

${ON_PUSH}

jobs:
${JOBS_TEST_COMMIT}
`;

const CINNABAR_META_MASTER = `name: Cinnabar Meta Version Updater

on:
  push:
    branches:
      - master
      - release/*
    paths:
      - update.cinnabarmeta

permissions:
  pull-requests: read

jobs:
${JOBS_RUN_CINNABAR_META}
`;

const CINNABAR_META_PULL_REQUESTS = `name: Cinnabar Meta Pull Request Check

on:
  pull_request:
    types: [opened, synchronize]

jobs:
${JOBS_CHECK_CINNABAR_META_FILE_EXISTS}`;

const CINNABAR_META_MASTER_FILE_PATH =
  ".github/workflows/cinnabar-meta-master.yml";
const CINNABAR_META_PULL_REQUESTS_FILE_PATH =
  ".github/workflows/cinnabar-meta-pull-requests.yml";
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
 * Check if the Cinnabar Meta Master workflow is correctly configured.
 * @param development
 */
export async function checkGithubActionsCinnabarMetaMaster(
  development: AncaDevelopment,
) {
  if (development.state == null) {
    return false;
  }
  const contents = development.state.files[CINNABAR_META_MASTER_FILE_PATH];
  if (contents == null) {
    return false;
  }
  return contents === CINNABAR_META_MASTER;
}

/**
 * Check if the Cinnabar Meta Pull Requests workflow is correctly configured.
 * @param development
 */
export async function checkGithubActionsCinnabarMetaPullRequests(
  development: AncaDevelopment,
) {
  if (development.state == null) {
    return false;
  }
  const contents =
    development.state.files[CINNABAR_META_PULL_REQUESTS_FILE_PATH];
  if (contents == null) {
    return false;
  }
  return contents === CINNABAR_META_PULL_REQUESTS;
}

/**
 * Check if the release workflow is correctly configured.
 * @param development
 */
export async function checkGithubActionsRelease(development: AncaDevelopment) {
  if (development.state == null) {
    return false;
  }
  const contents = development.state.files[RELEASE_FILE_PATH];
  if (contents == null) {
    return false;
  }
  return contents === getReleaseContents(development);
}

/**
 * Check if the test workflow is correctly configured.
 * @param development
 */
export async function checkGithubActionsTest(development: AncaDevelopment) {
  if (development.state == null) {
    return false;
  }
  const contents = development.state.files[TEST_FILE_PATH];
  if (contents == null) {
    return false;
  }
  return contents === TEST_NODEJS;
}

/**
 * Filter out Cinnabar Meta workflow files.
 * @param _development
 * @param file
 */
function filterGithubActionsFile(_development: AncaDevelopment, file: string) {
  if (file === "cinnabar-meta-master.yml") return false;
  if (file === "cinnabar-meta-pull-requests.yml") return false;
  if (file === "release.yml") return false;
  if (file === "test.yml") return false;
  return true;
}

/**
 * Check for other workflow files.
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
 * Fix the Cinnabar Meta Master workflow.
 * @param development
 */
export async function fixGithubActionsCinnabarMetaMaster(
  development: AncaDevelopment,
) {
  if (development.state == null) {
    return;
  }
  await createGithubActionsFolders(development.fullPath);
  fs.writeFileSync(
    path.join(development.fullPath, CINNABAR_META_MASTER_FILE_PATH),
    CINNABAR_META_MASTER,
  );
}

/**
 * Fix the Cinnabar Meta Pull Requests workflow.
 * @param development
 */
export async function fixGithubActionsCinnabarMetaPullRequests(
  development: AncaDevelopment,
) {
  if (development.state == null) {
    return;
  }
  await createGithubActionsFolders(development.fullPath);
  fs.writeFileSync(
    path.join(development.fullPath, CINNABAR_META_PULL_REQUESTS_FILE_PATH),
    CINNABAR_META_PULL_REQUESTS,
  );
}

/**
 * Fix the release workflow.
 * @param development
 */
export async function fixGithubActionsRelease(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await createGithubActionsFolders(development.fullPath);
  fs.writeFileSync(
    path.join(development.fullPath, RELEASE_FILE_PATH),
    getReleaseContents(development),
  );
}

/**
 * Fix the test workflow.
 * @param development
 */
export async function fixGithubActionsTest(development: AncaDevelopment) {
  if (development.state == null) {
    return;
  }
  await createGithubActionsFolders(development.fullPath);
  fs.writeFileSync(
    path.join(development.fullPath, TEST_FILE_PATH),
    TEST_NODEJS,
  );
}

/**
 * Fix other workflow files.
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
  for (const file of files) {
    if (filterGithubActionsFile(development, file)) {
      fs.rmSync(path.join(development.fullPath, ".github", "workflows", file));
    }
  }
}
