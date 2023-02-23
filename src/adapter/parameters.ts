import os from 'os';
import path from 'path';
import * as core from '@actions/core';
import { RenpyInputs, RenpyOutputs } from '../model/parameters';
import { stringToBool } from '../utils';

export function parseInputs(): RenpyInputs {
  const logger = getLogger();
  const version = core.getInput('version');
  let install_dir = core.getInput('install_dir');

  const opts: RenpyInputs = {
    action: core.getInput('action'),
    game_dir: core.getInput('game') || '.',
    install_dir: install_dir || path.join(os.homedir(), '.renpy_exec'),
    install_opts: {
      version: core.getInput('version') || '8.0.3',
      dlc_list: core
        .getInput('dlc')
        .split(/,|\s+/)
        .map(v => v.trim())
        .filter(s => !!s),
      live2d_url: core.getInput('live2d'),
      update_path: stringToBool(core.getInput('update_path'), false)
    }
  };
  logger.debug(`Mapped dlc input "${core.getInput('dlc')}" to ${opts.install_opts.dlc_list}`);
  switch (opts.action) {
    case 'install':
      break;
    case 'distribute':
      opts.distribute_opts = {
        packages: (core.getInput('packages') || 'all')
          .split(/,|\n/)
          .map(v => v.trim())
          .filter(s => !!s)
          .map(s => {
            const splitted = s.split(/\s+/);
            if (splitted.length == 1) {
              return s;
            } else {
              const pkg_name = splitted[0];
              if (pkg_name == 'all') {
                throw Error(
                  `Specifying a package file name for the generic 'all' package is not supported (in '${s}').`
                );
              }
              const path = s.substring(pkg_name.length).trim();
              return [pkg_name, path];
            }
          }),
        target_dir: core.getInput('out_dir')
      };
      break;
    case 'lint':
      opts.lint_opts = {};
      break;
    default:
      throw Error(`Invalid action: ${opts.action}`);
  }
  return opts;
}

export function writeOutputs(out: RenpyOutputs) {
  for (const k in out) {
    if ((out as any)[k] !== undefined) {
      core.setOutput(k, (out as any)[k]);
    }
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