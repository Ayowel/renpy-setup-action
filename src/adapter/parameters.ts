import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import {
  RenpyAndroidBuildTypes,
  RenpyInputs,
  RenPyInputsSupportedAction,
  RenpyOutputs
} from '../model/parameters';
import { stringToBool } from '../utils';
import { stringToAndroidProperties } from '../model/renpy';

export function parseInputs(): RenpyInputs {
  const logger = getLogger();
  let install_dir = core.getInput('install_dir');

  let opts: RenpyInputs = {
    action: undefined,
    game_dir: core.getInput('game') || '.',
    java_home: core.getInput('java_home'),
    install_dir: install_dir || path.join(os.homedir(), '.renpy_exec'),
    install_opts: {
      version: core.getInput('version') || '8.0.3',
      dlc_list: core
        .getInput('dlc')
        .split(/,|\s+/)
        .map(v => v.trim())
        .filter(s => !!s),
      live2d_url: core.getInput('live2d'),
      update_path: stringToBool(core.getInput('update_path'), false),
      android_sdk: stringToBool(core.getInput('android_sdk'), false),
      android_sdk_owner: core.getInput('android_sdk_owner'),
      android_sdk_install_input: core.getInput('android_sdk_install_input'),
      android_aab_properties: stringToAndroidProperties(
        core.getInput('android_aab_properties') || core.getInput('android_properties')
      ),
      android_apk_properties: stringToAndroidProperties(
        core.getInput('android_apk_properties') || core.getInput('android_properties')
      )
    }
  };
  logger.debug(`Mapped dlc input "${core.getInput('dlc')}" to ${opts.install_opts.dlc_list}`);
  if (opts.action != 'install') {
    // Validate install args here
    const iopts = opts.install_opts;
    if (iopts.android_sdk && !iopts.dlc_list.includes('rapt')) {
      logger.warning(
        "The android_sdk will be installed but 'rapt' is not in the dlc list. This is probably a mistake."
      );
    }
    if (
      (Object.keys(iopts.android_aab_properties).length > 0 ||
        Object.keys(iopts.android_apk_properties).length > 0) &&
      iopts.android_sdk == false
    ) {
      logger.warning(
        'android_properties are provided, but the android_sdk is not set to be installed. This is probably a mistake.'
      );
    }
  }
  const action = core.getInput('action');
  switch (action) {
    case RenPyInputsSupportedAction.Install:
      opts = {
        ...opts,
        action
      };
      break;
    case RenPyInputsSupportedAction.AndroidBuild:
      const build_type = core.getInput('build_type');
      const valid_build_types = Object.values(RenpyAndroidBuildTypes);
      if (!valid_build_types.includes(build_type as RenpyAndroidBuildTypes)) {
        throw Error(`Invalid build type '${build_type}', expected one of ${valid_build_types}`);
      }
      opts = {
        ...opts,
        action,
        android_build_opts: {
          target_dir: core.getInput('out_dir'),
          build_type: build_type as RenpyAndroidBuildTypes
        }
      };
      break;
    case RenPyInputsSupportedAction.Distribute:
      opts = {
        ...opts,
        action,
        distribute_opts: {
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
        }
      };
      break;
    case RenPyInputsSupportedAction.Lint:
      opts = {
        ...opts,
        action,
        lint_opts: {}
      };
      break;
    default:
      throw Error(`Invalid action: ${(opts as unknown as { action: string }).action}`);
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
