import * as fs from 'fs';
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
    install_dir: install_dir || path.join(os.homedir(), '.renpy_exec')
  };
  const action = core.getInput('action');
  switch (action) {
    case RenPyInputsSupportedAction.Install:
      opts = {
        ...opts,
        action,
        install_opts: {
          version: core.getInput('version') || 'latest',
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
        },
        downloader_opts: {
          use_github: stringToBool(core.getInput('use_github_releases'), true),
          use_cdn: stringToBool(core.getInput('use_cdn'), true),
          github_repo: core.getInput('github_releases_repo'),
          github_token: core.getInput('github_token', { required: true }),
          cdn_base_url: core.getInput('cdn_url')
        }
      };
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
    case RenPyInputsSupportedAction.Exec:
      opts = {
        ...opts,
        action,
        exec_opts: {
          run: core.getInput('run')
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
    case RenPyInputsSupportedAction.Nothing:
      opts = { ...opts, action };
      break;
    case RenPyInputsSupportedAction.Translate:
      const languages = core
        .getInput('languages')
        .split(/\s+/)
        .filter(v => !!v);
      if (languages.length == 0) {
        const tl_path = path.join(opts.game_dir, 'game', 'tl');
        if (!fs.existsSync(tl_path)) {
          throw Error(
            `No language was provided, but game/tl could not be found in '${opts.game_dir}' during automatic language detection.`
          );
        }
        for (const p of fs.readdirSync(tl_path)) {
          if (fs.statSync(path.join(tl_path, p)).isDirectory()) {
            languages.push(p);
          }
        }
        if (languages.length == 0) {
          throw Error(`No translation language was provided, and none was found in '${tl_path}'.`);
        }
      }
      opts = {
        ...opts,
        action,
        translate_opts: { languages }
      };
      break;
    default:
      throw Error(`Invalid action: ${action}`);
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
