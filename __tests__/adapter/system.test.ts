import fs from 'fs';
import path from 'path';

import { createTmpDir, initContext } from '../helpers/test_helpers.test';
import { RenpyInstaller } from '../../src/controller/installer';
import { getRenpyExecPath, getRenpyPythonPath } from '../../src/adapter/system';

let readonly_tmp_dir: string;
let renpy8_dir: string;
beforeAll(async () => {
  initContext();
  readonly_tmp_dir = createTmpDir();
  renpy8_dir = path.join(readonly_tmp_dir, 'renpy');
  const installer = new RenpyInstaller(renpy8_dir, '8.0.3');
  await installer.installCore();
}, 5 * 60 * 1000);

afterAll(async () => {
  fs.rmSync(readonly_tmp_dir, { recursive: true });
});

let tmp_dirs: string[] = [];
afterEach(async () => {
  for (const tmpdir of tmp_dirs) {
    fs.rmSync(tmpdir, { recursive: true });
  }
  tmp_dirs = [];

  jest.resetAllMocks();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('Renpy path getters run as expected', () => {
  test('getRenpyPythonPath resolves to a valid path', () => {
    const pypath = getRenpyPythonPath(renpy8_dir);
    expect(fs.existsSync(pypath)).toBe(true);
    expect(fs.statSync(pypath).mode & 100).toBeTruthy();
  });

  test('getRenpyPythonPath fails if python is not found', async () => {
    const fake_dir = createTmpDir();
    tmp_dirs.push(fake_dir);
    expect(() => getRenpyPythonPath(fake_dir)).toThrow();
  });

  test('RenpyExecutor.getRenpyPath resolves to the right path', () => {
    const renpy_path = getRenpyExecPath(renpy8_dir);
    expect(fs.existsSync(renpy_path)).toBe(true);
    expect(fs.statSync(renpy_path).mode & 100).toBeTruthy();
  });

  test("RenpyExecutor.getRenpyPath fails if Ren'Py is not found", async () => {
    const fake_dir = createTmpDir();
    tmp_dirs.push(fake_dir);
    expect(() => getRenpyExecPath(fake_dir)).toThrow();
  });
});
