import { fixAncaConfig } from "./actions/anca.js";
import { fixContributingMd } from "./actions/contributing.js";
import {
  fixDevcontainerDockerfile,
  fixDevcontainerJson,
} from "./actions/devcontainers.js";
import { fixGitIgnore } from "./actions/git.js";
import {
  fixGithubActionsCinnabarMetaMaster,
  fixGithubActionsCinnabarMetaPullRequests,
  fixGithubActionsOtherFiles,
  fixGithubActionsRelease,
  fixGithubActionsTest,
} from "./actions/github-actions.js";
import { fixLicenseMd } from "./actions/license.js";
import { fixNodejsEsbuildJs } from "./actions/nodejs-esbuild.js";
import { fixNodejsEslintConfigJs } from "./actions/nodejs-eslint.js";
import { generateNodejsOpenapiFiles } from "./actions/nodejs-openapi.js";
import {
  fixNodejsPrettierIgnore,
  fixNodejsPrettierRc,
} from "./actions/nodejs-prettier.js";
import {
  fixNodejsSeaBuildJs,
  fixNodejsSeaConfigJson,
} from "./actions/nodejs-sea.js";
import { fixNodejsSrc, fixNodejsTest } from "./actions/nodejs-src.js";
import { fixNodejsTsconfigJson } from "./actions/nodejs-tsconfig.js";
import { fixNodejsTsupConfigJs } from "./actions/nodejs-tsup.js";
import {
  type NodejsPackageJson,
  type NpmUpdate,
  fixNodejsPackageJson,
  getUpdatedPackagesCommitMessage,
  installNodejsDependencies,
  updateNodejsPackageJsonDependencies,
  updateNodejsPackageJsonDevDependencies,
  writeNodejsPackageJson,
} from "./actions/nodejs.js";
import { fixOpenapiJson } from "./actions/openapi.js";
import { fixReadmeMd } from "./actions/readme.js";
import { syncDevelopment } from "./developments.js";
import type { AncaAction, AncaDevelopment } from "./schema.js";

const actionMappings: Record<
  AncaAction,
  { action: (development: AncaDevelopment) => Promise<void>; label: string }
> = {
  ancaJsonFix: {
    action: async (development: AncaDevelopment) => {
      await fixAncaConfig(development);
    },
    label: "[anca.json] Fix",
  },
  contributingSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixContributingMd(development);
    },
    label: "[CONTRIBUTING.md] Set to default",
  },
  devcontainerDockerfileSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixDevcontainerDockerfile(development);
    },
    label: "[.devcontainer/Dockerfile] Set to default",
  },
  devcontainerJsonSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixDevcontainerJson(development);
    },
    label: "[.devcontainer/devcontainer.json] Set to default",
  },
  gitClone: {
    action: async (development: AncaDevelopment) => {
      await syncDevelopment(development);
    },
    label: "[git] Clone",
  },
  githubActionsCinnabarMetaMasterSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixGithubActionsCinnabarMetaMaster(development);
    },
    label: "[.github/workflows/cinnabar-meta-master.yml] Set to default",
  },
  githubActionsCinnabarMetaPullRequestsSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixGithubActionsCinnabarMetaPullRequests(development);
    },
    label: "[.github/workflows/cinnabar-meta-pull-requests.yml] Set to default",
  },
  githubActionsOtherFilesRemove: {
    action: async (development: AncaDevelopment) => {
      await fixGithubActionsOtherFiles(development);
    },
    label: "[.github/workflows] Remove other files",
  },
  githubActionsReleaseSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixGithubActionsRelease(development);
    },
    label: "[.github/workflows/release.yml] Set to default",
  },
  githubActionsTestSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixGithubActionsTest(development);
    },
    label: "[.github/workflows/test.yml] Set to default",
  },
  gitIgnoreSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixGitIgnore(development);
    },
    label: "[.gitignore] Set to default",
  },
  licenseSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixLicenseMd(development);
    },
    label: "[LICENSE] Set to default",
  },
  nodejsEsbuildSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsEsbuildJs(development);
    },
    label: "[esbuild.js] Set to default",
  },
  nodejsEslintSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsEslintConfigJs(development);
    },
    label: "[eslint.config.js] Set to default",
  },
  nodejsOpenapiSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await generateNodejsOpenapiFiles(development);
    },
    label: "[openapi] Set to default",
  },
  nodejsPackageJsonCheckUpdates: {
    action: async (development: AncaDevelopment) => {
      const fileContents = development.state?.jsonFiles[
        "package.json"
      ] as NodejsPackageJson;
      if (fileContents != null) {
        const rebuildFile: NodejsPackageJson = {};
        const npmUpdate: NpmUpdate = await updateNodejsPackageJsonDependencies(
          rebuildFile,
          development,
          false,
          true,
        );
        npmUpdate.push(
          ...(await updateNodejsPackageJsonDevDependencies(
            rebuildFile,
            development,
            false,
            true,
          )),
        );
        if (npmUpdate.length > 0) {
          console.log("\nAdd to commit message: \n");
          console.log(getUpdatedPackagesCommitMessage(npmUpdate));
          console.log();
        }
        fileContents.dependencies = rebuildFile.dependencies;
        fileContents.devDependencies = rebuildFile.devDependencies;
        await writeNodejsPackageJson(development);
        await installNodejsDependencies(development);
      }
    },
    label: "[package.json] Check dependencies updates",
  },
  nodejsPackageJsonFix: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsPackageJson(development, false);
      await writeNodejsPackageJson(development);
      await installNodejsDependencies(development);
    },
    label: "[package.json] Fix",
  },
  nodejsPackageJsonFixFull: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsPackageJson(development, true);
      await writeNodejsPackageJson(development);
      await installNodejsDependencies(development);
    },
    label: "[package.json] Fix & add optional fields",
  },
  nodejsPrettierIgnoreSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsPrettierIgnore(development);
    },
    label: "[.prettierignore] Set to default",
  },
  nodejsPrettierRcSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsPrettierRc(development);
    },
    label: "[.prettierrc] Set to default",
  },
  nodejsSeaBuildJsSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsSeaBuildJs(development);
    },
    label: "[sea.build.js] Set to default",
  },
  nodejsSeaConfigJsonSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsSeaConfigJson(development);
    },
    label: "[sea.config.json] Set to default",
  },
  nodejsSrcSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsSrc(development);
    },
    label: "[src/index.ts] Set to default",
  },
  nodejsTestSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsTest(development);
    },
    label: "[test/index.test.ts] Set to default",
  },
  nodejsTsconfigSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsTsconfigJson(development);
    },
    label: "[tsconfig.json] Set to default",
  },
  nodejsTsupConfigJsSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixNodejsTsupConfigJs(development);
    },
    label: "[tsup.config.js] Set to default",
  },
  openapiJsonSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixOpenapiJson(development);
    },
    label: "[openapi.json] Set to default",
  },
  readmeSetToDefault: {
    action: async (development: AncaDevelopment) => {
      await fixReadmeMd(development);
    },
    label: "[README.md] Set to default",
  },
};

/**
 *
 * @param action
 */
export function getAction(action: AncaAction) {
  return actionMappings[action];
}
