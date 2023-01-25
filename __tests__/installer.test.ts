import fs from 'fs';
import path from 'path';

import { getCache, createTmpDir, initContext } from './helpers/test_helpers.test';
import { RenpyInstaller } from '../src/installer';
import { RenpyInstallerOptions } from '../src/models';

jest.mock('@actions/core');

let tmpdir = '';
const cache_dir = getCache();

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

describe('isLoadWorking', () => {
  it.each([
    ['6.99.14.3', true],
    ['7.4.9', true],
    ['7.5.3', true],
    ['8.0.3', true],
    ['6.77.77', false]
  ])('Load %s (%s)', async (version, should_succeed) => {
    const installer = new RenpyInstaller(path.join(tmpdir, 'renpy'), version);

    if (should_succeed) {
      await expect(installer.load()).resolves.not.toThrow();
      expect(installer.getMetadata()).not.toBeUndefined();
    } else {
      await expect(installer.load()).rejects.toThrowError();
      expect(installer.getMetadata()).toBeUndefined();
    }
  });
});

describe('isInstallWorking', () => {
  it.each([['8.0.3']])(
    "Install Ren'Py %s",
    async version => {
      const renpy_dir = path.join(tmpdir, 'renpy');
      const installer = new RenpyInstaller(renpy_dir, version);
      const opts: RenpyInstallerOptions = {
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
        dlc_list: dlcs,
        live2d_url: '',
        update_path: false,
        version: renpy_version
      };
      const installer = new RenpyInstaller(renpy_dir, renpy_version);
      await expect(installer.install(opts)).resolves.not.toThrow();
      const location = renpy_dir;
      for (const filepath of expect_files) {
        expect(fs.existsSync(path.join(location, filepath))).toBeTruthy();
      }
    },
    3 * 60 * 1000
  );
});
