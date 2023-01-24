export interface RenpyInstallerOptions {
  version: string;
  dlc_list: string[];
  live2d_url: string;
  install_dir: string;
}

export interface RenpyOutputs {
  install_dir: string;
  python_path: string;
  renpy_path: string;
}
