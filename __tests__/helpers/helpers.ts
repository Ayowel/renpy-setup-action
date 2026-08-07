import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import { env } from 'process';
import { describe, jest } from '@jest/globals';

import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

export const baselineRenpyVersion = '8.5.3';

/** Return true if the promise resolves, false if it rejects */
export function is_promise_resolving<T>(prom: Promise<T>) {
  return prom.then(
    () => true,
    () => false
  );
}

export const describeIf = (condition: boolean, ...args: Parameters<typeof describe>) =>
  condition ? describe(...args) : describe.skip(...args);

export function initContext(modifier: (module_name: string, module: any) => any = (_, v) => v) {
  env.RUNNER_TEMP = getCachePath(); // Used by GitHub libraries for temporary data
  const tcDownloadTool = tc.downloadTool;
  jest.unstable_mockModule('@actions/core', () =>
    modifier('@actions/core', {
      ...core,
      info: jest.fn(core.info),
      getInput: jest.fn(() => ''),
      getMultilineInput: jest.fn(core.getMultilineInput),
      setOutput: jest.fn(core.setOutput),
      setFailed: jest.fn(core.setFailed)
    })
  );
  jest.unstable_mockModule('@actions/tool-cache', () =>
    modifier('@actions/tool-cache', {
      ...tc,
      downloadTool: jest.fn(async (url: string, dest: string | undefined) => {
        // Use hash to ensure we differentiate between sources
        console.debug(`Tool download request for ${url}`);
        const hash = crypto.createHash('md5').update(url).digest('base64');
        const filename = url.split('/').pop() as string;
        const cache_path = path.join(await getCache(), `${hash.slice(0, 5)}-${filename}`);
        if (!(await is_promise_resolving(fs.access(cache_path)))) {
          console.debug(`Downloading tool from ${url}`);
          await tcDownloadTool(url, cache_path);
        }
        if (dest) {
          await fs.symlink(dest, cache_path);
        } else {
          dest = cache_path;
        }
        console.debug(`Resolving path to locally-downloaded tool at ${dest} (from ${url})`);
        return await fs.realpath(dest);
      })
    })
  );
}

export function getCachePath() {
  return 'test_cache';
}

export async function getCache() {
  const path = getCachePath();
  return (await fs.mkdir(path, { recursive: true })) || path;
}

export async function createTmpDir(): Promise<string> {
  return await fs
    .access('test_tmp')
    .catch(() => fs.mkdir('test_tmp'))
    .then(() => fs.mkdtemp('test_tmp/jest-setup-renpy-'));
}
