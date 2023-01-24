import os from 'os';
import path from 'path';
import * as core from '@actions/core';
import { RenpyInstallerOptions, RenpyOutputs } from './models';

export function parseInputs(): RenpyInstallerOptions {
  const version = core.getInput('version');
  let install_dir = core.getInput('install_dir');

  const opts: RenpyInstallerOptions = {
    version: core.getInput('version'),
    dlc_list: core
      .getInput('dlc')
      .split(',')
      .map(v => v.trim())
      .filter(s => !!s),
    live2d_url: core.getInput('live2d'),
    install_dir: install_dir ? install_dir : path.join(os.homedir(), '.renpy_exec', version)
  };
  return opts;
}

export function writeOutputs(out: RenpyOutputs) {
  for (const k in out) {
    core.setOutput(k, out);
  }
}

export interface Logger {
  info: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;

  startGroup: (group: string) => void;
  endGroup: () => void;
}

export function getLogger(): Logger {
  return core;
}

export function fail(message: string | Error) {
  core.setFailed(message);
}
