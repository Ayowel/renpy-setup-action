import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { env } from 'process';

import * as tc from '@actions/tool-cache';

// CI complains if a non-test .ts file is outside /src
// Jest complains if a .test.ts does not contain a test
test('noop', () => {
  expect(true).toBe(true);
});

export const describeIf = (condition: boolean, ...args: Parameters<typeof describe>) =>
  condition ? describe(...args) : describe.skip(...args);

export function initContext() {
  env.RUNNER_TEMP = getCache();
  const tcDownloadTool = tc.downloadTool;
  jest.spyOn(tc, 'downloadTool').mockImplementation(async (url, dest) => {
    // Use hash to ensure we differentiate between sources
    const hash = crypto.createHash('md5').update(url).digest('base64');
    const filename = url.split('/').pop() as string;
    const cache_path = path.join(getCache(), `${hash.slice(0, 5)}-${filename}`);
    if (!fs.existsSync(cache_path)) {
      await tcDownloadTool(url, cache_path);
    }
    if (dest) {
      fs.symlinkSync(dest, cache_path);
    } else {
      dest = cache_path;
    }
    return fs.realpathSync(dest);
  });
}

export function getCache() {
  return fs.mkdirSync('test_cache', { recursive: true }) || 'test_cache';
}

export function createTmpDir(): string {
  return fs.mkdtempSync('jest-setup-renpy-');
}
