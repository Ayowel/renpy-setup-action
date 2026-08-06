import * as fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { initContext } from '../helpers/helpers';

import type { AssetDownload } from '../../src/adapter/download/interface';

beforeEach(() => initContext());

afterEach(() => {
  jest.clearAllMocks();
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
    const { MultiAssetDownload } = await import('../../src/adapter/download/interface');
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
    const { MultiAssetDownload } = await import('../../src/adapter/download/interface');
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
    const { MultiAssetDownload } = await import('../../src/adapter/download/interface');
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
    'GitHubAssetDownload has_release with release version %s returns %s',
    async (version, expected) => {
      const { GitHubAssetDownload } = await import('../../src/adapter/download/github');
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
    'GitHubAssetDownload download_installer with release version %s should work ? %s',
    async (version, should_succeed) => {
      const { GitHubAssetDownload } = await import('../../src/adapter/download/github');
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
    'GitHubAssetDownload download_dlc with release version %s and dlc %s should work ? %s',
    async (version, dlc, should_succeed) => {
      const { GitHubAssetDownload } = await import('../../src/adapter/download/github');
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
    'RenpyAssetDownload has_release with release version %s returns %s',
    async (version, expected) => {
      const { RenpyAssetDownload } = await import('../../src/adapter/download/renpy');
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
    'RenpyAssetDownload download_installer with release version %s should work ? %s',
    async (version, should_succeed) => {
      const { RenpyAssetDownload } = await import('../../src/adapter/download/renpy');
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
    'RenpyAssetDownload download_dlc with release version %s and dlc %s should work ? %s',
    async (version, dlc, should_succeed) => {
      const { RenpyAssetDownload } = await import('../../src/adapter/download/renpy');
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
