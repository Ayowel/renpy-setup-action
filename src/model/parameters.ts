interface RenpyInputsCore {
  //action: string;
  install_dir: string;
  game_dir: string;
  install_opts: RenpyInstallerOptions;
}

export enum RenPyInputsSupportedAction {
  Distribute = 'distribute',
  Install = 'install',
  Lint = 'lint'
}

interface RenpyInputsDistributeCore extends RenpyInputsCore {
  action: RenPyInputsSupportedAction.Distribute;
  distribute_opts: RenpyDistributeOptions;
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
  | RenpyInputsDistributeCore
  | RenpyInputsInstallCore
  | RenpyInputsLintCore
  | RenpyInputsOthCore;

export interface RenpyInstallerOptions {
  version: string;
  dlc_list: string[];
  live2d_url: string;
  update_path: boolean;
}

export interface RenpyDistributeOptions {
  packages: (string | [string, string])[];
  target_dir: string;
}

export interface RenpyLintOptions {}

export interface RenpyOutputs {
  install_dir: string;
  python_path: string;
  renpy_path: string;
}
