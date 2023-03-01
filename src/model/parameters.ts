import { RenpyAndroidProperties } from './renpy';

interface RenpyInputsCore {
  install_dir: string;
  game_dir: string;
  java_home: string;
  install_opts: RenpyInstallerOptions;
}

export enum RenPyInputsSupportedAction {
  AndroidBuild = 'android_build',
  Distribute = 'distribute',
  Exec = 'exec',
  Install = 'install',
  Lint = 'lint'
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
}
interface RenpyInputsLintCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.Lint;
  lint_opts: RenpyLintOptions;
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

export interface RenpyDistributeOptions {
  packages: (string | [string, string])[];
  target_dir: string;
}

export interface RenpyExecOptions {
  run: string;
}

export interface RenpyLintOptions {}

/* Output values */

export interface RenpyOutputs {
  install_dir: string;
  python_path: string;
  renpy_path: string;
}
