import fs from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { baselineRenpyVersion, createTmpDir, describeIf, initContext } from '../helpers/helpers';

import type { RenpyInstallerOptions } from '../../src/model/parameters';

let tmpdir = '';

beforeEach(async () => {
  tmpdir = await createTmpDir();
  initContext();
});

afterEach(async () => {
  await fs.rm(tmpdir, { recursive: true });

  jest.clearAllMocks();
});

describe('isInstallWorking', () => {
  it.each([[baselineRenpyVersion]])(
    "Install Ren'Py %s",
    async version => {
      const { RenpyInstaller } = await import('../../src/controller/installer');
      const { GitHubAssetDownload } = await import('../../src/adapter/download/github');
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
      await expect(fs.access(renpy_dir)).resolves.not.toThrow();
    },
    3 * 60 * 1000
  );
});

describe('isDlcInstallWorking', () => {
  it.each([[baselineRenpyVersion, ['steam'], ['lib/py3-linux-x86_64/libsteam_api.so']]])(
    'Install Renpy %s DLC %s',
    async (renpy_version, dlcs, expect_files) => {
      const { RenpyInstaller } = await import('../../src/controller/installer');
      const { GitHubAssetDownload } = await import('../../src/adapter/download/github');
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
      await Promise.all(
        expect_files.map(filepath =>
          expect(fs.access(path.join(location, filepath))).resolves.not.toThrow()
        )
      );
    },
    3 * 60 * 1000
  );
});

(
  [
    ['8.0.3', ['rapt', 'rapt/Sdk'], '8'],
    ['8.1.3', ['rapt', 'rapt/Sdk'], '8'],
    [baselineRenpyVersion, ['rapt', 'rapt/Sdk'], '21']
  ] as [string, string[], string][]
).forEach(([renpy_version, expect_files, java_version]) => {
  describeIf(!!process.env[`JAVA_HOME${java_version}`], 'AndroidSdkInstall', () => {
    let old_java_home: string | undefined = undefined;
    let old_path: string | undefined = undefined;

    beforeAll(() => {
      old_java_home = process.env.JAVA_HOME;
      old_path = process.env.PATH;
      process.env.JAVA_HOME = process.env[`JAVA_HOME${java_version}`];
      process.env.PATH = `${process.env.JAVA_HOME}/bin${path.delimiter}${process.env.PATH}`;
    });

    afterAll(() => {
      process.env.JAVA_HOME = old_java_home;
      process.env.PATH = old_path;
    });

    it(
      `Install Renpy ${renpy_version} DLC ${expect_files}`,
      async () => {
        const { RenpyInstaller } = await import('../../src/controller/installer');
        const { RenpyAssetDownload } = await import('../../src/adapter/download/renpy');
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
        const installer = new RenpyInstaller(renpy_dir, renpy_version, new RenpyAssetDownload());
        await expect(installer.install(opts)).resolves.not.toThrow();
        const location = renpy_dir;
        await Promise.all(
          expect_files.map(filepath =>
            expect(fs.access(path.join(location, filepath))).resolves.not.toThrow()
          )
        );
        const bundle_content = await fs.readFile(
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
});
