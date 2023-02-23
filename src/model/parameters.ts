export interface RenpyInputs {
  action: string;
  install_dir: string;
  game_dir: string;
  install_opts: RenpyInstallerOptions;
  distribute_opts?: RenpyDistributeOptions;
  lint_opts?: RenpyLintOptions;
}

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
