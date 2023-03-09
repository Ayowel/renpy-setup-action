import * as fs from 'fs';
import { initContext } from '../helpers/test_helpers.test';
import { GitHubAssetDownload } from '../../src/adapter/download/github';
import { RenpyAssetDownload } from '../../src/adapter/download/renpy';
import { AssetDownload, MultiAssetDownload } from '../../src/adapter/download/interface';

jest.mock('@actions/core');

beforeEach(() => {
  initContext();
});

afterEach(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('MultiAssetDownload works as intended', () => {
  const NoDownload: AssetDownload = {
    download_dlc: () => Promise.reject(),
    download_installer: () => Promise.reject(),
    has_release: () => Promise.resolve(false)
  };
  const YesDownload: AssetDownload = {
    download_dlc: () => Promise.resolve('path_to_dlc'),
    download_installer: () => Promise.resolve('path_to_installer'),
    has_release: () => Promise.resolve(true)
  };
  it.each([
    [false, [false]],
    [true, [true]],
    [true, [false, true]]
  ])('has_release returns %s with %s', async (expected, provided) => {
    const acc = new MultiAssetDownload();
    for (const yesno of provided) {
      acc.add_downloader(yesno ? YesDownload : NoDownload);
    }
    await expect(acc.has_release('latest')).resolves.toBe(expected);
  });
  it.each([
    [[false], true, undefined],
    [[true], false, 'path_to_installer'],
    [[false, true], false, 'path_to_installer']
  ])('download_installer throws with %s ? %s', async (provided, should_throw, expected) => {
    const acc = new MultiAssetDownload();
    for (const yesno of provided) {
      acc.add_downloader(yesno ? YesDownload : NoDownload);
    }
    if (should_throw) {
      await expect(acc.download_installer('latest')).rejects.toThrow();
    } else {
      await expect(acc.download_installer('latest')).resolves.toBe(expected);
    }
  });
  it.each([
    [[false], true, undefined],
    [[true], false, 'path_to_dlc'],
    [[false, true], false, 'path_to_dlc']
  ])('download_installer throws with %s ? %s', async (provided, should_throw, expected) => {
    const acc = new MultiAssetDownload();
    for (const yesno of provided) {
      acc.add_downloader(yesno ? YesDownload : NoDownload);
    }
    if (should_throw) {
      await expect(acc.download_dlc('latest', 'steam')).rejects.toThrow();
    } else {
      await expect(acc.download_dlc('latest', 'steam')).resolves.toBe(expected);
    }
  });
});

describe('GitHubAssetDownload works as intended', () => {
  it.each([
    ['latest', true],
    ['8.0.3', true],
    ['7', true],
    ['6', false]
  ])(
    'has_release with release version %s returns %s',
    async (version, expected) => {
      const dl = new GitHubAssetDownload();
      await expect(dl.has_release(version)).resolves.toBe(expected);
    },
    3 * 60 * 1000
  );

  it.each([
    ['8.0.3', true],
    ['8', true],
    ['6', false]
  ])(
    'download_installer with release version %s should work ? %s',
    async (version, should_succeed) => {
      const dl = new GitHubAssetDownload();
      await expect(dl.download_installer(version))[
        should_succeed ? 'resolves' : 'rejects'
      ].not.toBe(undefined);
    },
    3 * 60 * 1000
  );

  it.each([
    ['8', 'steam', true],
    ['7', 'rapt', true],
    ['8', 'reniopt', false]
  ])(
    'download_dlc with release version %s and dlc %s should work ? %s',
    async (version, dlc, should_succeed) => {
      const dl = new GitHubAssetDownload();
      let downloaded_file = '';
      const call_dl = async () => {
        downloaded_file = await dl.download_dlc(version, dlc);
      };
      if (should_succeed) {
        await expect(call_dl()).resolves.not.toThrow();
        expect(fs.existsSync(downloaded_file)).toBe(true);
      } else {
        await expect(call_dl()).rejects.toThrow();
      }
    },
    3 * 60 * 1000
  );
});

describe('RenpyAssetDownload works as intended', () => {
  it.each([
    ['8.0.3', true],
    ['8', false], // Partial patterns not supported for the official website
    ['6.99.14.3', true]
  ])(
    'has_release with release version %s returns %s',
    async (version, expected) => {
      const dl = new RenpyAssetDownload();
      await expect(dl.has_release(version)).resolves.toBe(expected);
    },
    3 * 60 * 1000
  );

  it.each([
    ['8.0.3', true],
    ['8', false],
    ['6.99.14.3', true]
  ])(
    'download_installer with release version %s should work ? %s',
    async (version, should_succeed) => {
      const dl = new RenpyAssetDownload();
      await expect(dl.download_installer(version))[
        should_succeed ? 'resolves' : 'rejects'
      ].not.toBe(undefined);
    },
    3 * 60 * 1000
  );

  it.each([
    ['8.0.3', 'steam', true],
    ['8.0.3', 'rapt', true],
    ['8.0.3', 'reniopt', false]
  ])(
    'download_dlc with release version %s and dlc %s should work ? %s',
    async (version, dlc, should_succeed) => {
      const dl = new RenpyAssetDownload();
      let downloaded_file = '';
      const call_dl = async () => {
        downloaded_file = await dl.download_dlc(version, dlc);
      };
      if (should_succeed) {
        await expect(call_dl()).resolves.not.toThrow();
        expect(fs.existsSync(downloaded_file)).toBe(true);
      } else {
        await expect(call_dl()).rejects.toThrow();
      }
    },
    3 * 60 * 1000
  );
});
