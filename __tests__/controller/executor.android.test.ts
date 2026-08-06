import cp from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, jest } from '@jest/globals';

import { baselineRenpyVersion, createTmpDir, describeIf, initContext } from '../helpers/helpers';

import type {
  RenpyAndroidBuildOptions,
  RenpyAssetDownloaderOptions,
  RenpyInstallerOptions
} from '../../src/model/parameters';
import type { RenpyAndroidProperties } from '../../src/model/renpy';

import { RenpyAndroidBuildTypes } from '../../src/model/parameters';

let tmp_dir: string;
beforeAll(
  async () => {
    initContext();
    tmp_dir = createTmpDir();
  },
  5 * 60 * 1000
);

beforeEach(() => initContext());

afterAll(async () => {
  fs.rmSync(tmp_dir, { recursive: true });
});

let tmp_dirs: string[] = [];
afterEach(async () => {
  for (const tmpdir of tmp_dirs) {
    fs.rmSync(tmpdir, { recursive: true });
  }
  tmp_dirs = [];

  jest.clearAllMocks();
});

(os.platform() == 'win32'
  ? [['8.0.3', '8']]
  : [
      ['8.0.3', '8'],
      ['8.1.3', '8'],
      [baselineRenpyVersion, '21']
    ]
).forEach(([renpy_version, java_version]) => {
  describeIf(
    !!process.env[`JAVA_HOME${java_version}`],
    `RenpyExecutor.android_build runs as expected on ${renpy_version}`,
    () => {
      let renpy_dir = '';
      let initial_path;
      let initial_java_home;
      beforeAll(() => {
        initial_path = process.env.PATH;
        initial_java_home = process.env.JAVA_HOME;
        initContext();
      });

      afterAll(() => {
        process.env.PATH = initial_path;
        process.env.JAVA_HOME = initial_java_home;
      });

      beforeEach(
        async () => {
          process.env.JAVA_HOME = process.env[`JAVA_HOME${java_version}`];
          process.env.PATH = `${process.env.JAVA_HOME}/bin${path.delimiter}${process.env.PATH}`;

          const outpath = path.join(tmp_dir, 'outdir');
          fs.mkdirSync(outpath);
          tmp_dirs.push(outpath);
          // Install Ren'Py with android
          const { RenpyInstaller } = await import('../../src/controller/installer');
          const { AssetDownloader } = await import('../../src/controller/downloader');
          renpy_dir = path.join(tmp_dir, `renpy_rapt_${renpy_version}`);
          const android_props: RenpyAndroidProperties = {};
          const opts: RenpyInstallerOptions = {
            android_aab_properties: android_props,
            android_apk_properties: android_props,
            android_sdk: true,
            android_sdk_owner: 'AnOwnerName',
            android_sdk_install_input: '',
            dlc_list: ['rapt'],
            live2d_url: '',
            update_path: false,
            version: renpy_version
          };
          const downloader_config: RenpyAssetDownloaderOptions = {
            use_github: true,
            github_repo: 'renpy/renpy',
            github_token: process.env['GITHUB_TOKEN'] || '',
            use_cdn: true,
            cdn_base_url: 'https://www.renpy.org/dl'
          };
          await new RenpyInstaller(
            renpy_dir,
            renpy_version,
            new AssetDownloader(downloader_config)
          ).install(opts);
        },
        5 * 60 * 1000
      );

      afterEach(() => {
        fs.rmSync(renpy_dir, { recursive: true });
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
        update_keystores: false,
        heap_size: '3'
      };

      it.each([
        [RenpyAndroidBuildTypes.PlayBundle, '.aab'],
        [RenpyAndroidBuildTypes.UniversalAPK, '.apk']
      ])(
        `Ensure %s builds finish as expected on ${renpy_version}`,
        async (build_type, file_ext) => {
          /* Create the game that will be generated */
          const { RenpyExecutor } = await import('../../src/controller/executor');
          const game_path = path.join(tmp_dir, `tmp_game_${build_type}`);
          fs.mkdirSync(path.join(game_path, 'game'), { recursive: true });
          tmp_dirs.push(game_path);
          fs.writeFileSync(
            path.join(game_path, 'game', 'scripts.rpy'),
            'label start:\n    "Love you people"\n'
          );
          fs.writeFileSync(
            path.join(game_path, '.android.json'),
            JSON.stringify(android_json_content)
          );
          // Renpy 8.1.0 and later do not generate a default keystore
          // in renpy's rapt project anymore and expect it to be in the game's directory
          for (const keystore_name of ['android', 'bundle']) {
            const store_path = path.join(renpy_dir, 'rapt', `${keystore_name}.keystore`);
            const keytool_bin = os.platform() == 'win32' ? 'keytool.exe' : 'keytool';
            if (!fs.existsSync(store_path)) {
              const create_result = cp.spawnSync(
                path.join(process.env['JAVA_HOME'] as string, 'bin', keytool_bin),
                [
                  '-genkey',
                  '-keystore',
                  store_path,
                  '-alias',
                  'android',
                  '-keyalg',
                  'RSA',
                  '-keysize',
                  '2048',
                  '-validity',
                  '365',
                  '-keypass',
                  'android',
                  '-storepass',
                  'android',
                  '-dname',
                  'CN=Renpy Setup'
                ]
              );
              if (create_result.status !== 0) {
                throw Error(`${create_result.stdout}\n${create_result.stderr}`);
              }
            }
          }
          await new Promise(r => setTimeout(r, 10 * 1000));
          /* Execute build and test */
          const executor = new RenpyExecutor(renpy_dir);
          const target_dir = path.join(tmp_dir, 'outdir');
          const opts: RenpyAndroidBuildOptions = { build_type, target_dir };
          await expect(executor.android_build(game_path, opts)).resolves.not.toThrow();
          const generated_files = fs.readdirSync(target_dir);
          expect(generated_files.filter(v => v.endsWith(file_ext))).toHaveLength(1);
        },
        10 * 60 * 1000
      );
    }
  );
});
