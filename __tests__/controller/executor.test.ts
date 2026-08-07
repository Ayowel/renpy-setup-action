import fs from 'fs/promises';
import path from 'path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  test
} from '@jest/globals';

import { baselineRenpyVersion, createTmpDir, initContext } from '../helpers/helpers';

import type { RenpyDistributeOptions } from '../../src/model/parameters';

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

beforeEach(() => initContext());

afterAll(async () => {
  await fs.rm(readonly_tmp_dir, { recursive: true });
});

let tmp_dirs: string[] = [];
afterEach(async () => {
  await Promise.all(tmp_dirs.map(tmpdir => fs.rm(tmpdir, { recursive: true })));
  tmp_dirs = [];
  jest.clearAllMocks();
});

describe('RenpyExecutor getters run as expected', () => {
  test('RenpyExecutor.getDirectory returns the proper path', async () => {
    const { RenpyExecutor } = await import('../../src/controller/executor');
    const executor = new RenpyExecutor(renpy8_dir);
    expect(executor.getDirectory()).toBe(renpy8_dir);
  });
});

describe('RenpyExecutor.lint runs as expected', () => {
  it.each([
    [true, 'label start:\n    "Hello"'],
    [false, 'label start:\n    jump thislabeldoesnotexist']
  ])(
    'Should the linter call succeed ? %s',
    async (should_resolve, script_content) => {
      const { RenpyExecutor } = await import('../../src/controller/executor');
      const game_dir = await createTmpDir();
      tmp_dirs.push(game_dir);
      await fs.mkdir(path.join(game_dir, 'game'));
      await fs.writeFile(path.join(game_dir, 'game', 'scripts.rpy'), script_content);

      const executor = new RenpyExecutor(renpy8_dir);
      const test = expect(executor.lint(game_dir, {}));
      if (should_resolve) {
        await test.resolves.not.toThrow();
      } else {
        await test.rejects.toThrow();
      }
    },
    15 * 1000
  );
});

describe('RenpyExecutor.translate runs as expected', () => {
  it.each([[['french', 'english'], 'label start:\n    "Hello"']])(
    'The translation should generate data for %s',
    async (languages, script_content) => {
      const { RenpyExecutor } = await import('../../src/controller/executor');
      const game_dir = await createTmpDir();
      tmp_dirs.push(game_dir);
      await fs.mkdir(path.join(game_dir, 'game'));
      await fs.writeFile(path.join(game_dir, 'game', 'scripts.rpy'), script_content);

      const executor = new RenpyExecutor(renpy8_dir);
      await expect(executor.translate(game_dir, { languages })).resolves.not.toThrow();
      for (const language of languages) {
        await expect(fs.access(path.join(game_dir, 'game', 'tl', language))).resolves.not.toThrow();
      }
    },
    15 * 1000
  );
});

describe('RenpyExecutor.exec runs as expected', () => {
  test(
    "Ensure exec does run the Ren'Py executable",
    async () => {
      const { RenpyExecutor } = await import('../../src/controller/executor');
      const executor = new RenpyExecutor(renpy8_dir);
      const test = executor.exec({ run: '"" --help' });
      let res: [string, string] = ['', ''];
      await expect(test.then(v => (res = v))).resolves.not.toThrow();
      expect(res[0]).toMatch(/usage: renpy\.py/);
      expect(res[0]).toMatch(/The Ren'Py visual novel engine\./);
      expect(res[1]).toBe('');
    },
    15 * 1000
  );
});

describe('RenpyExecutor.distribute runs as expected', () => {
  let game_dir: string;
  beforeEach(async () => {
    game_dir = await createTmpDir();
    tmp_dirs.push(game_dir);
    await fs.mkdir(path.join(game_dir, 'game'));
    const script_content = [
      'define build.name = "testgame"',
      'label start:',
      '    "Hello there"'
    ].join('\n');
    await fs.writeFile(path.join(game_dir, 'game', 'scripts.rpy'), script_content);
  });

  test(
    'Build several packages',
    async () => {
      const { RenpyExecutor } = await import('../../src/controller/executor');
      const target_dir = path.join(game_dir, 'target');
      const executor = new RenpyExecutor(renpy8_dir);
      const opts: RenpyDistributeOptions = {
        packages: ['win', 'mac'],
        target_dir
      };
      await executor.distribute(game_dir, opts);
      expect((await fs.readdir(target_dir)).length).toBe(opts.packages.length);
    },
    5 * 60 * 1000
  );

  test(
    'Build a package with target name',
    async () => {
      const { RenpyExecutor } = await import('../../src/controller/executor');
      const target_dir = path.join(game_dir, 'target');
      const short_name = 'testproject';
      const executor = new RenpyExecutor(renpy8_dir);
      const opts: RenpyDistributeOptions = {
        packages: [['linux', path.join(target_dir, short_name)]],
        target_dir: ''
      };
      await executor.distribute(game_dir, opts);
      const dir_content = await fs.readdir(target_dir);
      expect(dir_content.length).toBe(1);
      expect(path.basename(dir_content[0]).startsWith(short_name)).toBeTruthy();
    },
    5 * 60 * 1000
  );
});
