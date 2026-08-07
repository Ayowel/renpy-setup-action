import fs from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, jest, test } from '@jest/globals';
import * as base_core from '@actions/core';

import { initContext, createTmpDir } from './helpers/helpers';

import { RenPyInputsSupportedAction } from '../src/model/parameters';

describe('main properly handles input parameters', () => {
  let input: { [k: string]: string } = {};
  const start_env: { [id: string]: string } = {};
  Object.assign(start_env, process.env);
  let tmpdir = '';

  beforeAll(async () => {
    initContext((module_name, module) => {
      if (module_name === '@actions/core') {
        (module.getInput as jest.Mock<typeof base_core.getInput>).mockImplementation(
          (key: string) => input[key] || ''
        );
        (
          module.getMultilineInput as jest.Mock<typeof base_core.getMultilineInput>
        ).mockImplementation((key: string) => {
          if (input[key]) {
            return input[key].split('\n');
          } else {
            return [];
          }
        });
      }
      return module;
    });
    const system = await import('../src/adapter/system');
    jest.unstable_mockModule('../src/adapter/system', () => ({
      ...system,
      getRenpyExecPath: jest.fn(() => 'renpy_path'),
      getRenpyPythonPath: jest.fn(() => 'python_path')
    }));
  });

  beforeEach(async () => {
    await import('../src/adapter/system');
    const { RenpyExecutor } = await import('../src/controller/executor');
    const { RenpyInstaller } = await import('../src/controller/installer');
    tmpdir = await createTmpDir();
    input = {
      action: RenPyInputsSupportedAction.Install // default value
    };
    jest
      .spyOn(RenpyExecutor.prototype, 'android_build')
      .mockImplementation(() => Promise.resolve());
    jest.spyOn(RenpyExecutor.prototype, 'distribute').mockImplementation(() => Promise.resolve());
    jest
      .spyOn(RenpyExecutor.prototype, 'exec')
      .mockImplementation(() => Promise.resolve(['stdin', 'stdout']));
    jest.spyOn(RenpyExecutor.prototype, 'lint').mockImplementation(() => Promise.resolve());
    jest.spyOn(RenpyExecutor.prototype, 'translate').mockImplementation(() => Promise.resolve());
    jest.spyOn(RenpyInstaller.prototype, 'install').mockImplementation(() => {
      return fs.mkdir(path.join(tmpdir, 'renpy'));
    });
  });
  afterEach(async () => {
    await fs.rm(tmpdir, { recursive: true });
    for (const k in process.env) {
      // Regenerate env as it was before test
      if (k in start_env) {
        process.env[k] = start_env[k];
      } else {
        delete process.env[k];
      }
    }
    // jest.resetAllMocks();
    jest.clearAllMocks();
    // jest.restoreAllMocks();
  });

  test('Main calls setFailed when an error occurs', async () => {
    const core = await import('@actions/core');
    const { main } = await import('../src/setup-renpy');
    input['action'] = 'unsupported_action';
    await expect(main).resolves.not.toThrow();
    expect(core.setFailed).toHaveBeenCalled();
  });

  it.each([
    ['android_build', RenPyInputsSupportedAction.AndroidBuild],
    ['distribute', RenPyInputsSupportedAction.Distribute],
    ['exec', RenPyInputsSupportedAction.Exec],
    ['lint', RenPyInputsSupportedAction.Lint],
    ['translate', RenPyInputsSupportedAction.Translate]
  ])('main calls the right RenpyExecutor method when the action is %s', async (method, action) => {
    const core = await import('@actions/core');
    const { RenpyExecutor } = await import('../src/controller/executor');
    const { main } = await import('../src/setup-renpy');
    input['action'] = action;
    input['install_dir'] = tmpdir;
    input['build_type'] = 'apk';
    input['languages'] = 'None';
    await expect(main).resolves.not.toThrow();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect((RenpyExecutor.prototype as { [id: string]: any })[method]).toHaveBeenCalledTimes(1);
  });

  test('main does not call RenpyExecutor methods when the action is nothing', async () => {
    const core = await import('@actions/core');
    const { RenpyExecutor } = await import('../src/controller/executor');
    const { main } = await import('../src/setup-renpy');
    input['action'] = RenPyInputsSupportedAction.Nothing;
    input['install_dir'] = tmpdir;
    input['build_type'] = 'apk';
    await expect(main).resolves.not.toThrow();
    expect(core.setFailed).not.toHaveBeenCalled();
    ['android_build', 'distribute', 'exec', 'lint'].forEach(m =>
      expect((RenpyExecutor.prototype as { [id: string]: any })[m]).not.toHaveBeenCalled()
    );
  });

  test('main calls RenpyInstaller.install when the action is install', async () => {
    const core = await import('@actions/core');
    const { RenpyInstaller } = await import('../src/controller/installer');
    const { main } = await import('../src/setup-renpy');
    input['action'] = RenPyInputsSupportedAction.Install;
    input['install_dir'] = path.join(tmpdir, 'renpy');
    await expect(main).resolves.not.toThrow();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(RenpyInstaller.prototype.install).toHaveBeenCalledTimes(1);
  });

  test('main initializes the environment variables when java_home is provided', async () => {
    const core = await import('@actions/core');
    const { main } = await import('../src/setup-renpy');
    input['action'] = RenPyInputsSupportedAction.Install;
    input['install_dir'] = path.join(tmpdir, 'renpy');
    input['java_home'] = tmpdir;
    await expect(main).resolves.not.toThrow();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(process.env.JAVA_HOME).toBe(tmpdir);
  });
});
