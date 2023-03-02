import fs from 'fs';
import path from 'path';
import * as core from '@actions/core';
import * as asystem from '../src/adapter/system';
import { RenpyExecutor } from '../src/controller/executor';
import { RenpyInstaller } from '../src/controller/installer';
import { RenPyInputsSupportedAction } from '../src/model/parameters';
import { main } from '../src/setup-renpy';
import { initContext, createTmpDir } from './helpers/test_helpers.test';

describe('main properly handles input parameters', () => {
  let input: { [k: string]: string } = {};
  const start_env: { [id: string]: string } = {};
  Object.assign(start_env, process.env);
  let tmpdir = '';

  beforeEach(() => {
    initContext();
    tmpdir = createTmpDir();
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
    jest.spyOn(RenpyInstaller.prototype, 'install').mockImplementation(() => {
      fs.mkdirSync(path.join(tmpdir, 'renpy'));
      return Promise.resolve();
    });
    jest.spyOn(asystem, 'getRenpyExecPath').mockImplementation(() => 'renpy_path');
    jest.spyOn(asystem, 'getRenpyPythonPath').mockImplementation(() => 'python_path');
    jest.spyOn(core, 'setOutput');
    jest.spyOn(core, 'setFailed');
    jest.spyOn(core, 'getInput').mockImplementation(key => input[key] || '');
    jest.spyOn(core, 'getMultilineInput').mockImplementation(key => {
      if (input[key]) {
        return input[key].split('\n');
      } else {
        return [];
      }
    });
  });
  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true });
    for (const k in process.env) {
      // Regenerate env as it was before test
      if (k in start_env) {
        process.env[k] = start_env[k];
      } else {
        delete process.env[k];
      }
    }
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('Main calls setFailed when an error occurs', async () => {
    input['action'] = 'unsupported_action';
    await expect(main()).resolves.not.toThrow();
    expect(core.setFailed).toHaveBeenCalled();
  });

  it.each([
    ['android_build', RenPyInputsSupportedAction.AndroidBuild],
    ['distribute', RenPyInputsSupportedAction.Distribute],
    ['exec', RenPyInputsSupportedAction.Exec],
    ['lint', RenPyInputsSupportedAction.Lint]
  ])('main calls the right RenpyExecutor method when the action is %s', async (method, action) => {
    input['action'] = action;
    input['install_dir'] = tmpdir;
    input['build_type'] = 'apk';
    await expect(main()).resolves.not.toThrow();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect((RenpyExecutor.prototype as { [id: string]: any })[method]).toHaveBeenCalledTimes(1);
  });

  test('main does not call RenpyExecutor methods when the action is nothing', async () => {
    input['action'] = RenPyInputsSupportedAction.Nothing;
    input['install_dir'] = tmpdir;
    input['build_type'] = 'apk';
    await expect(main()).resolves.not.toThrow();
    expect(core.setFailed).not.toHaveBeenCalled();
    ['android_build', 'distribute', 'exec', 'lint'].forEach(m =>
      expect((RenpyExecutor.prototype as { [id: string]: any })[m]).not.toHaveBeenCalled()
    );
  });

  test('main calls RenpyInstaller.install when the action is install', async () => {
    input['action'] = RenPyInputsSupportedAction.Install;
    input['install_dir'] = path.join(tmpdir, 'renpy');
    await expect(main()).resolves.not.toThrow();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(RenpyInstaller.prototype.install).toHaveBeenCalledTimes(1);
  });

  test('main initializes the environment variables when java_home is provided', async () => {
    input['action'] = RenPyInputsSupportedAction.Install;
    input['install_dir'] = path.join(tmpdir, 'renpy');
    input['java_home'] = tmpdir;
    await expect(main()).resolves.not.toThrow();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(process.env.JAVA_HOME).toBe(tmpdir);
  });
});
