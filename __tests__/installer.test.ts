import fs from 'fs';
import https from 'https';
import path from 'path';
import util from 'util';

import * as tc from '@actions/tool-cache';

import { RenpyInstaller } from '../src/installer';

jest.mock('@actions/core');

let tmpdir = '';
const cache_dir = fs.mkdirSync('test_cache', { recursive: true }) || 'test_cache';

beforeEach(async () => {
  tmpdir = await util.promisify(fs.mkdtemp)('jest-setup-renpy-');

  const spyTcDownloadTool = jest.spyOn(tc, 'downloadTool');
  spyTcDownloadTool.mockImplementation(async (url, dest) => {
    const filename = url.split('/').pop() as string;
    const cache_path = path.join(cache_dir, filename);
    if (fs.existsSync(cache_path)) {
      if (dest) {
        fs.symlinkSync(dest, cache_path);
      } else {
        dest = cache_path;
      }
      return util.promisify(fs.realpath)(dest);
    }
    return new Promise((resolve, reject) => {
      const req = https.get(url, res => {
        if (res.statusCode && res.statusCode >= 400) {
          reject('Received error code');
        }
        const filePath = fs.createWriteStream(cache_path);
        res.pipe(filePath);
        filePath.on('finish', async () => {
          filePath.close();
          if (dest) {
            fs.symlinkSync(dest, cache_path);
          } else {
            dest = cache_path;
          }
          resolve(await util.promisify(fs.realpath)(dest));
        });
      });
    });
  });
});

afterEach(async () => {
  await util.promisify(fs.rm)(tmpdir, { recursive: true });

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
    const installer = new RenpyInstaller({
      dlc_list: [],
      install_dir: path.join(tmpdir, 'renpy'),
      live2d_url: '',
      version
    });

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
      const installer = new RenpyInstaller({
        dlc_list: [],
        install_dir: path.join(tmpdir, 'renpy'),
        live2d_url: '',
        version
      });
      await expect(installer.load()).resolves.not.toThrow();
      await expect(installer.installCore()).resolves.not.toThrow();
      expect(fs.existsSync(installer.getRenpyPath())).toBeTruthy();
      expect(fs.existsSync(installer.getPythonPath())).toBeTruthy();
    },
    3 * 60 * 1000
  );
});

describe('isDlcInstallWorking', () => {
  it.each([['8.0.3', ['steam'], ['lib/py3-linux-x86_64/libsteam_api.so']]])(
    'Install Renpy %s DLC %s',
    async (renpy_version, dlcs, expect_files) => {
      const installer = new RenpyInstaller({
        dlc_list: [],
        install_dir: path.join(tmpdir, 'renpy'),
        live2d_url: '',
        version: renpy_version
      });
      await expect(installer.load()).resolves.not.toThrow();
      await expect(installer.installCore()).resolves.not.toThrow();
      for (const dlc of dlcs) {
        await expect(installer.installDlc(dlc)).resolves.not.toThrow();
      }
      const location = installer.getEffectiveDir();
      for (const filepath of expect_files) {
        expect(fs.existsSync(path.join(location, filepath))).toBeTruthy();
      }
    },
    3 * 60 * 1000
  );
});
