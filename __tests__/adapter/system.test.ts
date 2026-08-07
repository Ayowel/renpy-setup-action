import fs from 'fs/promises';
import path from 'path';
import { afterAll, afterEach, beforeAll, describe, expect, jest, test } from '@jest/globals';

import { baselineRenpyVersion, createTmpDir, initContext } from '../helpers/helpers';

let readonly_tmp_dir: string;
let renpy8_dir: string;
beforeAll(
  async () => {
    initContext();
    const { RenpyInstaller } = await import('../../src/controller/installer');
    const { GitHubAssetDownload } = await import('../../src/adapter/download/github');
    readonly_tmp_dir = await createTmpDir();
    renpy8_dir = path.join(readonly_tmp_dir, 'renpy');
    const installer = new RenpyInstaller(
      renpy8_dir,
      baselineRenpyVersion,
      new GitHubAssetDownload()
    );
    await installer.installCore();
  },
  5 * 60 * 1000
);

afterAll(async () => {
  await fs.rm(readonly_tmp_dir, { recursive: true });
});

let tmp_dirs: string[] = [];
afterEach(async () => {
  await Promise.all(tmp_dirs.map(tmpdir => fs.rm(tmpdir, { recursive: true })));
  tmp_dirs = [];
  jest.clearAllMocks();
});

describe('Renpy path getters run as expected', () => {
  test('getRenpyPythonPath resolves to a valid path', async () => {
    const { getRenpyPythonPath } = await import('../../src/adapter/system');
    const pypath = await getRenpyPythonPath(renpy8_dir);
    await expect(fs.access(pypath, fs.constants.X_OK)).resolves.not.toThrow();
  });

  test('getRenpyPythonPath fails if python is not found', async () => {
    const { getRenpyPythonPath } = await import('../../src/adapter/system');
    const fake_dir = await createTmpDir();
    tmp_dirs.push(fake_dir);
    await expect(getRenpyPythonPath(fake_dir)).rejects.toThrow();
  });

  test('RenpyExecutor.getRenpyPath resolves to the right path', async () => {
    const { getRenpyExecPath } = await import('../../src/adapter/system');
    const renpy_path = await getRenpyExecPath(renpy8_dir);
    await expect(fs.access(renpy_path, fs.constants.X_OK)).resolves.not.toThrow();
  });

  test("RenpyExecutor.getRenpyPath fails if Ren'Py is not found", async () => {
    const { getRenpyExecPath } = await import('../../src/adapter/system');
    const fake_dir = await createTmpDir();
    tmp_dirs.push(fake_dir);
    await expect(getRenpyExecPath(fake_dir)).rejects.toThrow();
  });
});
