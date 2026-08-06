import fs from 'fs';
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
    readonly_tmp_dir = createTmpDir();
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
  fs.rmSync(readonly_tmp_dir, { recursive: true });
});

let tmp_dirs: string[] = [];
afterEach(async () => {
  for (const tmpdir of tmp_dirs) {
    fs.rmSync(tmpdir, { recursive: true });
  }
  tmp_dirs = [];

  jest.clearAllMocks();
});

describe('Renpy path getters run as expected', () => {
  test('getRenpyPythonPath resolves to a valid path', async () => {
    const { getRenpyPythonPath } = await import('../../src/adapter/system');
    const pypath = getRenpyPythonPath(renpy8_dir);
    expect(fs.existsSync(pypath)).toBe(true);
    expect(fs.statSync(pypath).mode & 100).toBeTruthy();
  });

  test('getRenpyPythonPath fails if python is not found', async () => {
    const { getRenpyPythonPath } = await import('../../src/adapter/system');
    const fake_dir = createTmpDir();
    tmp_dirs.push(fake_dir);
    expect(() => getRenpyPythonPath(fake_dir)).toThrow();
  });

  test('RenpyExecutor.getRenpyPath resolves to the right path', async () => {
    const { getRenpyExecPath } = await import('../../src/adapter/system');
    const renpy_path = getRenpyExecPath(renpy8_dir);
    expect(fs.existsSync(renpy_path)).toBe(true);
    expect(fs.statSync(renpy_path).mode & 100).toBeTruthy();
  });

  test("RenpyExecutor.getRenpyPath fails if Ren'Py is not found", async () => {
    const { getRenpyExecPath } = await import('../../src/adapter/system');
    const fake_dir = createTmpDir();
    tmp_dirs.push(fake_dir);
    expect(() => getRenpyExecPath(fake_dir)).toThrow();
  });
});
