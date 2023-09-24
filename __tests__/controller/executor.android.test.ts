import cp from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { createTmpDir, describeIf, initContext } from '../helpers/test_helpers.test';
import { RenpyExecutor } from '../../src/controller/executor';
import { RenpyInstaller } from '../../src/controller/installer';
import {
  RenpyAndroidBuildOptions,
  RenpyAndroidBuildTypes,
  RenpyInstallerOptions
} from '../../src/model/parameters';
import { GitHubAssetDownload } from '../../src/adapter/download/github';
import { RenpyAndroidProperties } from '../../src/model/renpy';

let readonly_tmp_dir: string;
beforeAll(async () => {
  initContext();
  readonly_tmp_dir = createTmpDir();
}, 5 * 60 * 1000);

beforeEach(() => initContext());

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

(os.platform() == 'win32' ? ['8.0.3'] : ['8.0.3', '8.1.3']).forEach(renpy_version => {
  describeIf(
    !!process.env['JAVA_HOME'],
    `RenpyExecutor.android_build runs as expected on ${renpy_version}`,
    () => {
      let renpy_dir = '';
      beforeAll(async () => {
        initContext();
        renpy_dir = path.join(readonly_tmp_dir, `renpy_rapt_${renpy_version}`);
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
        await new RenpyInstaller(renpy_dir, renpy_version, new GitHubAssetDownload()).install(opts);
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
        update_keystores: false,
        heap_size: '3'
      };

      it.each([
        [RenpyAndroidBuildTypes.PlayBundle, '.aab'],
        [RenpyAndroidBuildTypes.UniversalAPK, '.apk']
      ])(
        "'Ensure %s builds finish as expected'",
        async (build_type, file_ext) => {
          /* Create the game that will be generated */
          const game_path = path.join(readonly_tmp_dir, `tmp_game_${build_type}`);
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
          const target_dir = path.join(readonly_tmp_dir, 'outdir');
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
