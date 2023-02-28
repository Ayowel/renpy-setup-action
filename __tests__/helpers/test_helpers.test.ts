import fs from 'fs';
import https from 'https';
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
  const spyTcDownloadTool = jest.spyOn(tc, 'downloadTool');
  spyTcDownloadTool.mockImplementation(toolCacheDownloadToolMock);
}

export function getCache() {
  return fs.mkdirSync('test_cache', { recursive: true }) || 'test_cache';
}

export function createTmpDir(): string {
  return fs.mkdtempSync('jest-setup-renpy-');
}

export async function toolCacheDownloadToolMock(
  url: string,
  dest: string | undefined
): Promise<string> {
  const filename = url.split('/').pop() as string;
  const cache_path = path.join(getCache(), filename);
  if (fs.existsSync(cache_path)) {
    if (dest) {
      fs.symlinkSync(dest, cache_path);
    } else {
      dest = cache_path;
    }
    return fs.realpathSync(dest);
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
        resolve(fs.realpathSync(dest));
      });
    });
  });
}
