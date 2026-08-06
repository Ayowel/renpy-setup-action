import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, jest, test } from '@jest/globals';

import { createTmpDir, initContext } from '../helpers/helpers';

import type { RenpyOutputs } from '../../src/model/parameters';

beforeEach(initContext);

afterEach(() => {
  jest.clearAllMocks();
});

test('fail calls core.setFailed', async () => {
  const core = await import('@actions/core');
  const io = await import('../../src/adapter/parameters');

  const error_message = 'Test error message';
  io.fail(error_message);
  expect(core.setFailed).toHaveBeenCalledWith(error_message);
});

test('getLogger provides a logger that writes to @actions/core', async () => {
  const core = await import('@actions/core');
  const io = await import('../../src/adapter/parameters');
  const log_message = 'Test info message';
  io.getLogger().info(log_message);
  expect(core.info).toHaveBeenCalledWith(log_message);
});

test('writeOutputs uses @actions/core', async () => {
  const core = await import('@actions/core');
  const io = await import('../../src/adapter/parameters');
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
  beforeEach(async () => {
    const core = await import('@actions/core');
    const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
    input = {
      action: RenPyInputsSupportedAction.Install // default value
    };
    (core.getInput as jest.Mock<typeof core.getInput>).mockImplementation(key => input[key] || '');
    (core.getMultilineInput as jest.Mock<typeof core.getMultilineInput>).mockImplementation(key => {
      if (input[key]) {
        return input[key].split('\n');
      } else {
        return [];
      }
    });
  });

  test('Unknown actions throw an error', async () => {
    const io = await import('../../src/adapter/parameters');
    input['action'] = 'unsupportedactionname';
    expect(io.parseInputs).toThrow();
  });

  it.each([
    ['', []],
    ['  steam  ', ['steam']],
    ['steam, renios', ['steam', 'renios']],
    [' steam renios ', ['steam', 'renios']]
  ])('Dlc install list is parsed: "%s"', async (input_dlc, expected) => {
    const io = await import('../../src/adapter/parameters');
    const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
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
  ])('Package distribution list is parsed: "%s"', async (input_pkg, expected) => {
    const io = await import('../../src/adapter/parameters');
    const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
    input['action'] = RenPyInputsSupportedAction.Distribute;
    input['packages'] = input_pkg;
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.Distribute);
    if (opts.action === RenPyInputsSupportedAction.Distribute) {
      expect(opts.distribute_opts.packages).toEqual(expected);
    }
  });

  test('Mapping the "all" package to a file path throws an error', async () => {
    const io = await import('../../src/adapter/parameters');
    const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
    input['action'] = RenPyInputsSupportedAction.Distribute;
    input['packages'] = 'all path/to/all';
    expect(io.parseInputs).toThrow();
  });

  test('Lint action is detected', async () => {
    const io = await import('../../src/adapter/parameters');
    const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
    input['action'] = RenPyInputsSupportedAction.Lint;
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.Lint);
  });

  test('Android build action is detected', async () => {
    const io = await import('../../src/adapter/parameters');
    const { RenpyAndroidBuildTypes, RenPyInputsSupportedAction } =
      await import('../../src/model/parameters');
    input['action'] = RenPyInputsSupportedAction.AndroidBuild;
    input['build_type'] = RenpyAndroidBuildTypes.PlayBundle;
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.AndroidBuild);
    if (opts.action == RenPyInputsSupportedAction.AndroidBuild) {
      expect(opts.android_build_opts.build_type).toBe(RenpyAndroidBuildTypes.PlayBundle);
    }
  });

  test('Exec action is detected', async () => {
    const io = await import('../../src/adapter/parameters');
    const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
    input['action'] = RenPyInputsSupportedAction.Exec;
    input['run'] = '--help';
    const opts = io.parseInputs();
    expect(opts.action).toBe(RenPyInputsSupportedAction.Exec);
    if (opts.action == RenPyInputsSupportedAction.Exec) {
      expect(opts.exec_opts.run).toBe('--help');
    }
  });

  test('Android build action fails on unknown build type', async () => {
    const io = await import('../../src/adapter/parameters');
    const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
    input['action'] = RenPyInputsSupportedAction.AndroidBuild;
    input['build_type'] = 'sos';
    expect(() => io.parseInputs()).toThrow();
  });

  test('Translate action is detected', async () => {
    const io = await import('../../src/adapter/parameters');
    const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
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

    test('Translate action only picks up directories in the tl directory', async () => {
      const io = await import('../../src/adapter/parameters');
      const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
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

    test('Translate action throws if there is no directory in tl while no language was provided', async () => {
      const io = await import('../../src/adapter/parameters');
      const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
      fs.mkdirSync(path.join(tmpPath, 'game', 'tl'), { recursive: true });
      fs.writeFileSync(path.join(tmpPath, 'game', 'tl', 'english'), '');
      fs.writeFileSync(path.join(tmpPath, 'game', 'tl', 'french'), '');
      input['action'] = RenPyInputsSupportedAction.Translate;
      input['game'] = tmpPath;
      expect(() => io.parseInputs()).toThrow();
    });

    test('Translate action throws if there is no tl directory while no language was provided', async () => {
      const io = await import('../../src/adapter/parameters');
      const { RenPyInputsSupportedAction } = await import('../../src/model/parameters');
      fs.mkdirSync(path.join(tmpPath, 'game'));
      input['action'] = RenPyInputsSupportedAction.Translate;
      input['game'] = tmpPath;
      expect(() => io.parseInputs()).toThrow();
    });
  });
});
