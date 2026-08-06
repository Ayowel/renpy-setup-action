import { jest } from '@jest/globals';
import * as crypto from 'crypto';
import path from 'path';
import fs from 'fs';
// import { https } from 'follow-redirects';
import * as base_os from 'os';
import * as base_child_process from 'child_process';
import * as base_actions_core from '@actions/core';
import * as base_actions_tool_cache from '@actions/tool-cache';

function mock_os() {
  return jest.unstable_mockModule('os', () => ({
    ...base_os,
    platform: jest.fn(base_os.platform),
    arch: jest.fn(base_os.arch)
  }));
}

function mock_child_process() {
  return jest.unstable_mockModule('child_process', () => ({
    ...base_child_process,
    spawn: jest.fn(base_child_process.spawn)
  }));
}

function mock_actions_core() {
  return jest.unstable_mockModule('@actions/core', () => ({
    ...base_actions_core,
    getInput: jest.fn((name: string, options?: { required?: boolean }) => {
      const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
      if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
      }
      return val.trim();
    }),
    setOutput: jest.fn(base_actions_core.setOutput),
    addPath: jest.fn(base_actions_core.addPath),
    debug: jest.fn(base_actions_core.debug),
    error: jest.fn(base_actions_core.error)
  }));
}

const cache_dir = fs.mkdirSync('test_cache', { recursive: true }) || 'test_cache';

function mock_actions_tool_cache() {
  const actions_tool_cache = jest.unstable_mockModule('@actions/tool-cache', () => ({
    ...base_actions_tool_cache,
    downloadTool: async (url, dest) => {
      // Use hash to ensure we differentiate between sources
      const hash = crypto.createHash('md5').update(url).digest('base64');
      const filename = url.split('/').pop() as string;
      const cache_path = path.join(getCache(), `${hash.slice(0, 5)}-${filename}`);
      if (!fs.existsSync(cache_path)) {
        await base_actions_tool_cache.downloadTool(url, cache_path);
      }
      if (dest) {
        fs.symlinkSync(dest, cache_path);
      } else {
        dest = cache_path;
      }
      return fs.realpathSync(dest);
    }
  }));
}

function getCache() {
  return fs.mkdirSync('test_cache', { recursive: true }) || 'test_cache';
}

export { mock_actions_core, mock_actions_tool_cache, mock_child_process, mock_os };
