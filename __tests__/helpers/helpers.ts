import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { env } from 'process';
import { describe, jest } from '@jest/globals';

import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

export const baselineRenpyVersion = '8.5.3';

export const describeIf = (condition: boolean, ...args: Parameters<typeof describe>) =>
  condition ? describe(...args) : describe.skip(...args);

export function initContext(modifier: (module_name: string, module: any) => any = (_, v) => v) {
  env.RUNNER_TEMP = getCache();
  const tcDownloadTool = tc.downloadTool;
  jest.unstable_mockModule('@actions/core', () =>
    modifier('@actions/core', {
      ...core,
      info: jest.fn(core.info),
      getInput: jest.fn(() => ''), //core.getInput),
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
        const cache_path = path.join(getCache(), `${hash.slice(0, 5)}-${filename}`);
        if (!fs.existsSync(cache_path)) {
          console.debug(`Downloading tool from ${url}`);
          await tcDownloadTool(url, cache_path);
        }
        if (dest) {
          fs.symlinkSync(dest, cache_path);
        } else {
          dest = cache_path;
        }
        console.debug(`Resolving path to locally-downloaded tool at ${dest} (from ${url})`);
        return fs.realpathSync(dest);
      })
    })
  );
}

export function getCache() {
  return fs.mkdirSync('test_cache', { recursive: true }) || 'test_cache';
}

export function createTmpDir(): string {
  if (!fs.existsSync('test_tmp')) {
    fs.mkdirSync('test_tmp');
  }
  return fs.mkdtempSync('test_tmp/jest-setup-renpy-');
}
