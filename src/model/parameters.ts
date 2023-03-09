import { RenpyAndroidProperties } from './renpy';

interface RenpyInputsCore {
  install_dir: string;
  game_dir: string;
  java_home: string;
}

export enum RenPyInputsSupportedAction {
  AndroidBuild = 'android_build',
  Distribute = 'distribute',
  Exec = 'exec',
  Install = 'install',
  Lint = 'lint',
  Nothing = 'nothing',
  Translate = 'translate'
}

/* Full parameter lists */

interface RenpyInputsAndroidBuildCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.AndroidBuild;
  android_build_opts: RenpyAndroidBuildOptions;
}
interface RenpyInputsDistributeCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.Distribute;
  distribute_opts: RenpyDistributeOptions;
}
interface RenpyInputsExecCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.Exec;
  exec_opts: RenpyExecOptions;
}
interface RenpyInputsInstallCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.Install;
  install_opts: RenpyInstallerOptions;
  downloader_opts: RenpyAssetDownloaderOptions;
}
interface RenpyInputsLintCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.Lint;
  lint_opts: RenpyLintOptions;
}
interface RenpyInputsNothingCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.Nothing;
}
interface RenpyInputsTranslateCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.Translate;
  translate_opts: RenpyTranslateOptions;
}
interface RenpyInputsOthCore extends RenpyInputsCore {
  action: undefined;
}

export type RenpyInputs =
  | RenpyInputsAndroidBuildCore
  | RenpyInputsDistributeCore
  | RenpyInputsExecCore
  | RenpyInputsInstallCore
  | RenpyInputsLintCore
  | RenpyInputsNothingCore
  | RenpyInputsTranslateCore
  | RenpyInputsOthCore;

/* Action-specific parameters */

export enum RenpyAndroidBuildTypes {
  PlayBundle = 'aab',
  UniversalAPK = 'apk'
}

export interface RenpyAndroidBuildOptions {
  target_dir: string;
  build_type: RenpyAndroidBuildTypes;
}

export interface RenpyInstallerOptions {
  version: string;
  dlc_list: string[];
  live2d_url: string;
  update_path: boolean;
  android_aab_properties: RenpyAndroidProperties;
  android_apk_properties: RenpyAndroidProperties;
  android_sdk: boolean;
  android_sdk_owner: string;
  android_sdk_install_input: string;
}

export interface RenpyAssetDownloaderOptions {
  use_github: boolean;
  github_repo: string;
  github_token: string;
  use_cdn: boolean;
  cdn_base_url: string;
}

export interface RenpyDistributeOptions {
  packages: (string | [string, string])[];
  target_dir: string;
}

export interface RenpyExecOptions {
  run: string;
}

export interface RenpyLintOptions {}

export interface RenpyTranslateOptions {
  languages: string[];
}

/* Output values */

export interface RenpyOutputs {
  install_dir: string;
  python_path: string;
  renpy_path: string;
}
