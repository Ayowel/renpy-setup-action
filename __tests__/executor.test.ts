import fs from 'fs';
import path from 'path';

import { createTmpDir, initContext } from './helpers/test_helpers.test';
import { RenpyExecutor } from '../src/executor';
import { RenpyInstaller } from '../src/installer';
import { RenpyDistributeOptions } from '../src/models';

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

describe('RenpyExecutor introspection methods run as expected', () => {
  test('RenpyExecutor.getDirectory returns the proper path', () => {
    const executor = new RenpyExecutor(renpy8_dir);
    expect(executor.getDirectory()).toBe(renpy8_dir);
  });

  test('RenpyExecutor.getPythonPath resolves to the right path', () => {
    const executor = new RenpyExecutor(renpy8_dir);
    const pypath = executor.getPythonPath();
    expect(fs.existsSync(pypath)).toBe(true);
    expect(fs.statSync(pypath).mode & 100).toBeTruthy();
  });

  test('RenpyExecutor.getPythonPath fails if python is not found', async () => {
    const fake_dir = createTmpDir();
    tmp_dirs.push(fake_dir);
    const executor = new RenpyExecutor(fake_dir);
    expect(() => executor.getPythonPath()).toThrow();
  });

  test('RenpyExecutor.getRenpyPath resolves to the right path', () => {
    const executor = new RenpyExecutor(renpy8_dir);
    const renpy_path = executor.getRenpyPath();
    expect(fs.existsSync(renpy_path)).toBe(true);
    expect(fs.statSync(renpy_path).mode & 100).toBeTruthy();
  });

  test("RenpyExecutor.getRenpyPath fails if Ren'Py is not found", async () => {
    const fake_dir = createTmpDir();
    tmp_dirs.push(fake_dir);
    const executor = new RenpyExecutor(fake_dir);
    expect(() => executor.getRenpyPath()).toThrow();
  });
});

describe('RenpyExecutor.lint runs as expected', () => {
  it.each([
    [true, 'label start:\n    "Hello"'],
    [false, 'label start:\n    jump thislabeldoesnotexist']
  ])('Should the linter call succeed ? %s', async (should_resolve, script_content) => {
    const game_dir = createTmpDir();
    tmp_dirs.push(game_dir);
    fs.mkdirSync(path.join(game_dir, 'game'));
    fs.writeFileSync(path.join(game_dir, 'game', 'scripts.rpy'), script_content);

    const executor = new RenpyExecutor(renpy8_dir);
    const test = expect(executor.lint(game_dir, {}));
    if (should_resolve) {
      await test.resolves.not.toThrow();
    } else {
      await test.rejects.toThrow();
    }
  });
});

describe('RenpyExecutor.distribute runs as expected', () => {
  let game_dir: string;
  beforeEach(async () => {
    game_dir = createTmpDir();
    tmp_dirs.push(game_dir);
    fs.mkdirSync(path.join(game_dir, 'game'));
    const script_content = ['define build.name = "testgame"', 'label start:', '    "Hello"'].join(
      '\n'
    );
    fs.writeFileSync(path.join(game_dir, 'game', 'scripts.rpy'), script_content);
  });

  test(
    'Build several packages',
    async () => {
      const target_dir = path.join(game_dir, 'target');
      const executor = new RenpyExecutor(renpy8_dir);
      const opts: RenpyDistributeOptions = {
        packages: ['win', 'mac'],
        target_dir
      };
      await executor.distribute(game_dir, opts);
      expect(fs.readdirSync(target_dir).length).toBe(opts.packages.length);
    },
    5 * 60 * 1000
  );

  test(
    'Build a package with target name',
    async () => {
      const target_dir = path.join(game_dir, 'target');
      const short_name = 'testproject';
      const executor = new RenpyExecutor(renpy8_dir);
      const opts: RenpyDistributeOptions = {
        packages: [['linux', path.join(target_dir, short_name)]],
        target_dir: ''
      };
      await executor.distribute(game_dir, opts);
      const dir_content = fs.readdirSync(target_dir);
      expect(dir_content.length).toBe(1);
      expect(path.basename(dir_content[0]).startsWith(short_name)).toBeTruthy();
    },
    5 * 60 * 1000
  );
});
