import fs from 'fs';
import path from 'path';

import { createTmpDir, describeIf, initContext } from '../helpers/test_helpers.test';
import { RenpyInstaller } from '../../src/controller/installer';
import { RenpyInstallerOptions } from '../../src/model/parameters';
import { GitHubAssetDownload } from '../../src/adapter/download/github';

jest.mock('@actions/core');

let tmpdir = '';

beforeEach(async () => {
  tmpdir = createTmpDir();
  initContext();
});

afterEach(async () => {
  fs.rmSync(tmpdir, { recursive: true });

  jest.resetAllMocks();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('isInstallWorking', () => {
  it.each([['8.0.3']])(
    "Install Ren'Py %s",
    async version => {
      const renpy_dir = path.join(tmpdir, 'renpy');
      const installer = new RenpyInstaller(renpy_dir, version, new GitHubAssetDownload());
      const opts: RenpyInstallerOptions = {
        android_aab_properties: {},
        android_apk_properties: {},
        android_sdk: false,
        android_sdk_owner: '',
        android_sdk_install_input: '',
        dlc_list: [],
        live2d_url: '',
        update_path: false,
        version
      };
      await expect(installer.install(opts)).resolves.not.toThrow();
      expect(fs.existsSync(renpy_dir)).toBeTruthy();
    },
    3 * 60 * 1000
  );
});

describe('isDlcInstallWorking', () => {
  it.each([['8.0.3', ['steam'], ['lib/py3-linux-x86_64/libsteam_api.so']]])(
    'Install Renpy %s DLC %s',
    async (renpy_version, dlcs, expect_files) => {
      const renpy_dir = path.join(tmpdir, 'renpy');
      const opts: RenpyInstallerOptions = {
        android_aab_properties: {},
        android_apk_properties: {},
        android_sdk: false,
        android_sdk_owner: '',
        android_sdk_install_input: '',
        dlc_list: dlcs,
        live2d_url: '',
        update_path: false,
        version: renpy_version
      };
      const installer = new RenpyInstaller(renpy_dir, renpy_version, new GitHubAssetDownload());
      await expect(installer.install(opts)).resolves.not.toThrow();
      const location = renpy_dir;
      for (const filepath of expect_files) {
        expect(fs.existsSync(path.join(location, filepath))).toBeTruthy();
      }
    },
    3 * 60 * 1000
  );
});

describeIf(!!process.env['JAVA_HOME'], 'isAndroidSdkInstallWorking', () => {
  it.each([
    ['8.0.3', ['rapt', 'rapt/Sdk']],
    ['8.1.3', ['rapt', 'rapt/Sdk']]
  ])(
    'Install Renpy %s DLC %s',
    async (renpy_version, expect_files) => {
      const renpy_dir = path.join(tmpdir, 'renpy');
      const opts: RenpyInstallerOptions = {
        android_aab_properties: { 'key.store.password': 'test_password', 'new.key': 'tee' },
        android_apk_properties: {},
        android_sdk: true,
        android_sdk_owner: 'AnOwnerName',
        android_sdk_install_input: '',
        dlc_list: ['rapt'],
        live2d_url: '',
        update_path: false,
        version: renpy_version
      };
      const installer = new RenpyInstaller(renpy_dir, renpy_version, new GitHubAssetDownload());
      await expect(installer.install(opts)).resolves.not.toThrow();
      const location = renpy_dir;
      for (const filepath of expect_files) {
        expect(fs.existsSync(path.join(location, filepath))).toBeTruthy();
      }
      const bundle_content = fs.readFileSync(
        path.join(location, 'rapt', 'project', 'bundle.properties')
      );
      const bundle_lines = bundle_content.toString().split('\n');
      // Ensure key.store.password is replaced
      const bundle_password_keys = bundle_lines.filter(v => v.startsWith('key.store.password='));
      expect(bundle_password_keys).toHaveLength(1);
      expect(bundle_password_keys[0]).toBe('key.store.password=test_password');
      // Ensure new.key is created
      expect(bundle_lines).toContain('new.key=tee');
      // Ensure one of the keys generated by Ren'Py still exists
      expect(bundle_lines.filter(v => v.startsWith('sdk.dir='))).toHaveLength(1);
    },
    3 * 60 * 1000
  );
});
