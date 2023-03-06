import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as io from '../../src/adapter/parameters';
import {
  RenpyAndroidBuildTypes,
  RenpyInputs,
  RenPyInputsSupportedAction,
  RenpyOutputs
} from '../../src/model/parameters';
import { createTmpDir } from '../helpers/test_helpers.test';

jest.mock('@actions/core');

afterEach(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

test('fail calls core.setFailed', () => {
  const error_message = 'Test error message';
  io.fail(error_message);
  expect(core.setFailed).toHaveBeenCalledWith(error_message);
});

test('getLogger provides a logger that writes to @actions/core', () => {
  const log_message = 'Test info message';
  io.getLogger().info(log_message);
  expect(core.info).toHaveBeenCalledWith(log_message);
});

test('writeOutputs uses @actions/core', () => {
  const outputs: RenpyOutputs = {
    install_dir: 'renpy/path',
    renpy_path: 'renpy/path/renpy.sh',
    python_path: 'renpy/path/lib/python'
  };
  io.writeOutputs(outputs);
  expect(core.setOutput).toHaveBeenCalledWith('install_dir', outputs.install_dir);
  expect(core.setOutput).toHaveBeenCalledWith('renpy_path', outputs.renpy_path);
  expect(core.setOutput).toHaveBeenCalledWith('python_path', outputs.python_path);
});

describe('parseInputs handles GitHub input values', () => {
  let input: { [k: string]: string } = {};
  beforeEach(() => {
    input = {
      action: RenPyInputsSupportedAction.Install // default value
    };
    jest.spyOn(core, 'getInput').mockImplementation(key => input[key] || '');
    jest.spyOn(core, 'getMultilineInput').mockImplementation(key => {
      if (input[key]) {
        return input[key].split('\n');
      } else {
        return [];
      }
    });
  });

  test('Unknown actions throw an error', () => {
    input['action'] = 'unsupportedactionname';
    expect(io.parseInputs).toThrow();
  });

  it.each([
    ['', []],
    ['  steam  ', ['steam']],
    ['steam, renios', ['steam', 'renios']],
    [' steam renios ', ['steam', 'renios']]
  ])('Dlc install list is parsed: "%s"', (input_dlc, expected) => {
    input['dlc'] = input_dlc;
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.Install);
    if (opts.action == RenPyInputsSupportedAction.Install) {
      expect(opts.install_opts.dlc_list).toEqual(expected);
    }
  });

  it.each([
    ['', ['all']], // Build all by default
    ['all', ['all']],
    [' win, mac ', ['win', 'mac']],
    ['win\nmac', ['win', 'mac']],
    ['win path/to/win\nmac', [['win', 'path/to/win'], 'mac']],
    [' win, mac   path/to/mac  \n linux ', ['win', ['mac', 'path/to/mac'], 'linux']]
  ])('Package distribution list is parsed: "%s"', (input_pkg, expected) => {
    input['action'] = RenPyInputsSupportedAction.Distribute;
    input['packages'] = input_pkg;
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.Distribute);
    if (opts.action === RenPyInputsSupportedAction.Distribute) {
      expect(opts.distribute_opts.packages).toEqual(expected);
    }
  });

  test('Mapping the "all" package to a file path throws an error', () => {
    input['action'] = RenPyInputsSupportedAction.Distribute;
    input['packages'] = 'all path/to/all';
    expect(io.parseInputs).toThrow();
  });

  test('Lint action is detected', () => {
    input['action'] = RenPyInputsSupportedAction.Lint;
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.Lint);
  });

  test('Android build action is detected', () => {
    input['action'] = RenPyInputsSupportedAction.AndroidBuild;
    input['build_type'] = RenpyAndroidBuildTypes.PlayBundle;
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.AndroidBuild);
    if (opts.action == RenPyInputsSupportedAction.AndroidBuild) {
      expect(opts.android_build_opts.build_type).toBe(RenpyAndroidBuildTypes.PlayBundle);
    }
  });

  test('Exec action is detected', () => {
    input['action'] = RenPyInputsSupportedAction.Exec;
    input['run'] = '--help';
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.Exec);
    if (opts.action == RenPyInputsSupportedAction.Exec) {
      expect(opts.exec_opts.run).toBe('--help');
    }
  });

  test('Android build action fails on unknown build type', () => {
    input['action'] = RenPyInputsSupportedAction.AndroidBuild;
    input['build_type'] = 'sos';
    expect(() => io.parseInputs()).toThrow();
  });

  test('Translate action is detected', () => {
    input['action'] = RenPyInputsSupportedAction.Translate;
    input['languages'] = 'french \n \t \n english';
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.Translate);
    if (opts.action == RenPyInputsSupportedAction.Translate) {
      expect(opts.translate_opts.languages.sort()).toEqual(['english', 'french']);
    }
  });

  describe('Translate action looks up the tl directory if no language is provided', () => {
    let tmpPath = '';
    beforeEach(() => {
      tmpPath = createTmpDir();
    });
    afterEach(() => {
      fs.rmSync(tmpPath, { recursive: true });
    });
    test('Translate action only picks up directories in the tl directory', () => {
      fs.mkdirSync(path.join(tmpPath, 'game', 'tl', 'german'), { recursive: true });
      fs.mkdirSync(path.join(tmpPath, 'game', 'tl', 'french'));
      fs.writeFileSync(path.join(tmpPath, 'game', 'tl', 'english'), '');
      input['action'] = RenPyInputsSupportedAction.Translate;
      input['game'] = tmpPath;
      const opts = io.parseInputs();
      expect(opts.action).toBe(RenPyInputsSupportedAction.Translate);
      if (opts.action == RenPyInputsSupportedAction.Translate) {
        expect(opts.translate_opts.languages.sort()).toEqual(['french', 'german']);
      }
    });
    test('Translate action throws if there is no directory in tl while no language was provided', () => {
      fs.mkdirSync(path.join(tmpPath, 'game', 'tl'), { recursive: true });
      fs.writeFileSync(path.join(tmpPath, 'game', 'tl', 'english'), '');
      fs.writeFileSync(path.join(tmpPath, 'game', 'tl', 'french'), '');
      input['action'] = RenPyInputsSupportedAction.Translate;
      input['game'] = tmpPath;
      expect(() => io.parseInputs()).toThrow();
    });
    test('Translate action throws if there is no tl directory while no language was provided', () => {
      fs.mkdirSync(path.join(tmpPath, 'game'));
      input['action'] = RenPyInputsSupportedAction.Translate;
      input['game'] = tmpPath;
      expect(() => io.parseInputs()).toThrow();
    });
  });
});
