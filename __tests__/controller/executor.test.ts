import fs from 'fs';
import path from 'path';

import { createTmpDir, describeIf, initContext } from '../helpers/test_helpers.test';
import { RenpyExecutor } from '../../src/controller/executor';
import { RenpyInstaller } from '../../src/controller/installer';
import {
  RenpyAndroidBuildOptions,
  RenpyAndroidBuildTypes,
  RenpyDistributeOptions,
  RenpyInstallerOptions
} from '../../src/model/parameters';

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

describe('RenpyExecutor getters run as expected', () => {
  test('RenpyExecutor.getDirectory returns the proper path', () => {
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
    },
    15 * 1000
  );
});

describe('RenpyExecutor.translate runs as expected', () => {
  it.each([[['french', 'english'], 'label start:\n    "Hello"']])(
    'The translation should generate data for %s',
    async (languages, script_content) => {
      const game_dir = createTmpDir();
      tmp_dirs.push(game_dir);
      fs.mkdirSync(path.join(game_dir, 'game'));
      fs.writeFileSync(path.join(game_dir, 'game', 'scripts.rpy'), script_content);

      const executor = new RenpyExecutor(renpy8_dir);
      await expect(executor.translate(game_dir, { languages })).resolves.not.toThrow();
      for (const language of languages) {
        expect(fs.existsSync(path.join(game_dir, 'game', 'tl', language))).toBe(true);
      }
    },
    15 * 1000
  );
});

describe('RenpyExecutor.exec runs as expected', () => {
  test(
    "Ensure exec does run the Ren'Py executable",
    async () => {
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

describeIf(!!process.env['JAVA_HOME'], 'isAndroidBuildWorking', () => {
  let renpy_dir = '';
  beforeAll(async () => {
    renpy_dir = path.join(readonly_tmp_dir, 'renpy_rapt');
    const renpy_version = '8.0.3';
    const opts: RenpyInstallerOptions = {
      android_aab_properties: {},
      android_apk_properties: {},
      android_sdk: true,
      android_sdk_owner: 'AnOwnerName',
      android_sdk_install_input: '',
      dlc_list: ['rapt'],
      live2d_url: '',
      update_path: false,
      version: renpy_version
    };
    await new RenpyInstaller(renpy_dir, renpy_version).install(opts);
  }, 5 * 60 * 1000);

  beforeEach(async () => {
    const outpath = path.join(readonly_tmp_dir, 'outdir');
    fs.mkdirSync(outpath);
    tmp_dirs.push(outpath);
  });

  const android_json_content = {
    package: 'com.ayowel.setup.renpy',
    name: 'test_game',
    icon_name: 'test_game',
    version: '1.0',
    numeric_version: 1,
    orientation: 'sensorLandscape',
    permissions: ['VIBRATE', 'INTERNET'],
    include_pil: false,
    include_sqlite: false,
    layout: null,
    source: false,
    expansion: false,
    google_play_key: null,
    google_play_salt: null,
    store: 'none',
    update_icons: true,
    update_always: true,
    heap_size: '3'
  };

  it.each([
    [RenpyAndroidBuildTypes.PlayBundle, '.aab'],
    [RenpyAndroidBuildTypes.UniversalAPK, '.apk']
  ])(
    "'Ensure %s builds finish as expected'",
    async (build_type, file_ext) => {
      /* Create the game that will be generated */
      const game_path = path.join(readonly_tmp_dir, 'tmp_game');
      fs.mkdirSync(path.join(game_path, 'game'), { recursive: true });
      tmp_dirs.push(game_path);
      fs.writeFileSync(
        path.join(game_path, 'game', 'scripts.rpy'),
        'label start:\n    "Love you people"\n'
      );
      fs.writeFileSync(path.join(game_path, '.android.json'), JSON.stringify(android_json_content));
      /* Execute build and test */
      const executor = new RenpyExecutor(renpy_dir);
      const opts: RenpyAndroidBuildOptions = {
        build_type,
        target_dir: path.join(readonly_tmp_dir, 'outdir')
      };
      await expect(executor.android_build(game_path, opts)).resolves.not.toThrow();
      const generated_files = fs.readdirSync(path.join(readonly_tmp_dir, 'outdir'));
      expect(generated_files.filter(v => v.endsWith(file_ext))).toHaveLength(1);
    },
    5 * 60 * 1000
  );
});
