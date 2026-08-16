import * as fs from 'fs/promises';
import * as fs_native from 'fs';
import * as path from 'path';

import * as core from '@actions/core';
import * as cache from '@actions/cache';
import * as tc from '@actions/tool-cache';
import * as yauzl from 'yauzl';
import { getLogger } from '../adapter/parameters';
import { renpyPythonExec } from '../adapter/system';
import { RenpyInstallerOptions, RenpyInstallOutputs } from '../model/parameters';
import {
  RenpyAndroidProperties,
  androidPropertiesToString,
  stringToAndroidProperties
} from '../model/renpy';
import { AssetDownload } from '../adapter/download/interface';
import { is_promise_resolving } from '../utils';

const logger = getLogger();

export async function installLive2D(source_path: string, patterns: [RegExp, string][]) {
  if (!(await is_promise_resolving(fs.access(source_path)))) {
    source_path = await tc.downloadTool(source_path);
  }
  const zipfile = await yauzl.openPromise(source_path);
  let extraction_counter = 0;
  for await (const entry of zipfile.eachEntry()) {
    if (entry.fileName.endsWith('/')) {
      continue;
    }
    for (const pattern of patterns) {
      if (entry.fileName.match(pattern[0]) == null) {
        continue;
      }
      const target_path = entry.fileName.replace(pattern[0], pattern[1]);
      core.debug(`Extracting file in ${source_path} from ${entry.fileName} to ${target_path}`);
      fs.mkdir(path.dirname(target_path), { recursive: true });
      const read_promise = await zipfile.openReadStreamPromise(entry);
      read_promise.pipe(fs_native.createWriteStream(target_path));
      await new Promise((resolve, reject) => {
        read_promise.on('end', resolve);
        read_promise.on('error', reject);
      });
      extraction_counter += 1;
    }
  }
  zipfile.close();
  if (extraction_counter == 0) {
    throw Error(`Failed to extract files from ${source_path}`);
  }
  core.debug(`Extracted ${extraction_counter} files from ${source_path}.`);
}

export class RenpyInstaller {
  protected version: string;
  protected install_dir: string;
  protected downloader: AssetDownload;

  constructor(directory: string, version: string, downloader: AssetDownload) {
    this.version = version;
    this.install_dir = directory;
    this.downloader = downloader;
  }

  public async install(opts: RenpyInstallerOptions): Promise<RenpyInstallOutputs> {
    const outputs: RenpyInstallOutputs = {
      cache_key: opts.cache_key,
      cache_hit: false,
      cache_save: false
    };
    logger.info(`Installing Ren'Py version ${opts.version}`);
    let cache_hit = false;
    if (opts.cache_load) {
      core.debug(`Attempting to restore cache at ${this.install_dir} with ${opts.cache_key}`);
      const cache_hit_key = await cache.restoreCache([this.install_dir], opts.cache_key);
      cache_hit = cache_hit_key !== undefined;
      if (cache_hit) {
        core.info(`Loading Ren'Py in ${this.install_dir} from cache.`);
      } else {
        core.info(`No cache found for Ren'Py, proceeding with regular install`);
      }
      outputs.cache_hit = cache_hit;
    }
    if (!cache_hit) {
      await this.installCore();
      if (opts.dlc_list.length > 0) {
        logger.info('Install DLCs');
        for (const dlc of opts.dlc_list) {
          logger.info(`Installing DLC ${dlc}.`);
          await this.installDlc(dlc);
        }
      } else {
        logger.debug('No DLC to install.');
      }

      if (opts.live2d_native) {
        logger.info('Install Live2D Native');
        await installLive2D(opts.live2d_native, [
          [
            /^.*\/Core\/dll\/linux\/x86_64\/(libLive2DCubismCore.so)$/,
            path.join(this.install_dir, 'lib/py3-linux-x86_64/$1')
          ],
          [
            /^.*\/Core\/dll\/windows\/x86_64\/(Live2DCubismCore.dll)$/,
            path.join(this.install_dir, 'lib/py3-windows-x86_64/$1')
          ],
          [
            /^.*\/Core\/dll\/macos\/(libLive2DCubismCore\.dylib)$/,
            path.join(this.install_dir, 'lib/py3-mac-universal/$1')
          ],
          [
            /^.*\/Core\/dll\/experimental\/rpi\/(libLive2DCubismCore.so)$/,
            path.join(this.install_dir, 'lib/py3-linux-armv7l/$1')
          ],

          [
            /^.*\/Core\/dll\/android\/(armeabi-v7a\/libLive2DCubismCore.so)$/,
            path.join(this.install_dir, 'rapt/prototype/renpyandroid/src/main/jniLibs/$1')
          ],
          [
            /^.*\/Core\/dll\/android\/(arm64-v8a\/libLive2DCubismCore.so)$/,
            path.join(this.install_dir, 'rapt/prototype/renpyandroid/src/main/jniLibs/$1')
          ],
          [
            /^.*\/Core\/dll\/android\/(x86_64\/libLive2DCubismCore.so)$/,
            path.join(this.install_dir, 'rapt/prototype/renpyandroid/src/main/jniLibs/$1')
          ]
        ]);
      } else {
        logger.debug('No configured Live2D Native source');
      }

      if (opts.live2d_web) {
        logger.info('Install Live2D Web');
        //             (r".*/Core/live2dcubismcore.js", "lib/web/live2dcubismcore.js"),
        await installLive2D(opts.live2d_web, [
          [
            /^.*\/Core\/live2dcubismcore.js$/,
            path.join(this.install_dir, 'lib/web/live2dcubismcore.js')
          ]
        ]);
      } else {
        logger.debug('No configured Live2D Web source');
      }

      if (opts.android_sdk) {
        logger.info('Install Android SDK');
        const sdk_input =
          opts.android_sdk_install_input ||
          `y\ny\n${opts.android_sdk_owner}\ny\ny\n${opts.android_sdk_owner}\ny\n`;
        await this.installAndroidSdk(sdk_input);
        logger.info('Configure Android SDK build properties');
        const project_path = path.join(this.install_dir, 'rapt', 'project');

        for (const target_pair of [
          ['bundle', 'bundle'],
          ['local', 'android']
        ]) {
          const default_properties = {
            // Sets the default key values if none is set
            'key.alias': 'android',
            'key.store.password': 'android',
            'key.alias.password': 'android',
            'key.store': path.join(
              path.resolve(this.install_dir),
              'rapt',
              `${target_pair[1]}.keystore`
            ),
            'sdk.dir': path.join(path.resolve(this.install_dir), 'rapt', 'Sdk')
          };
          const updated_keys = await this.updateKeyValueConfig(
            path.join(project_path, `${target_pair[0]}.properties`),
            opts.android_aab_properties,
            default_properties
          );
          if (!(await is_promise_resolving(fs.access(updated_keys['key.store'])))) {
            logger.warning(
              `The keystore path in ${target_pair[0]} does not appear to map to an existing keystore file (${updated_keys['key.store']}).`
            );
          }
        }
      }
      if (opts.cache_save) {
        core.debug(`Attempting to save cache at ${this.install_dir} with ${opts.cache_key}`);
        const cache_id = await cache.saveCache([this.install_dir], opts.cache_key);
        if (cache_id != -1) {
          core.info(`Saved Ren'Py in ${this.install_dir} to cache ${opts.cache_key}.`);
        } else {
          core.info(`Failed to save Ren'Py to cache`);
        }
        outputs.cache_save = cache_id != -1;
      }
    }

    if (opts.update_path) {
      core.addPath(this.install_dir);
    }

    return outputs;
  }

  public async installCore() {
    if (await is_promise_resolving(fs.access(this.install_dir))) {
      throw Error(
        `The Ren'Py install directory exists before install. This is not supported. (path: ${this.install_dir})`
      );
    }

    logger.info("Downloading Ren'Py archive");
    const core_archive = await this.downloader.download_installer(this.version);
    logger.debug(`Start extraction of Ren'Py archive ${core_archive}`);
    await fs.mkdir(this.install_dir, { recursive: true });
    const absolute_path = await fs.realpath(core_archive);
    // Windows and Mac tar supports zip files
    await tc.extractTar(absolute_path, this.install_dir, ['x', '--strip-components=1']);
  }

  public async installDlc(dlc: string) {
    // Download & extract files
    logger.debug(`Download dlc ${dlc}.`);
    const file = await this.downloader.download_dlc(this.version, dlc);
    logger.debug(`Extracting downloaded dlc file.`);
    const absolute_path = await fs.realpath(file);
    await tc.extractZip(absolute_path, this.install_dir);
  }

  public async installAndroidSdk(setupinfo: string) {
    const args = [
      '-c',
      [
        'import os',
        'import sys',
        'sys.path.insert(0, os.path.join(os.getcwd(), "rapt", "buildlib"))',
        'import rapt.interface',
        'import rapt.install_sdk',
        'rapt.install_sdk.install_sdk(rapt.interface.Interface())'
      ].join('\n')
    ];
    return await renpyPythonExec(this.install_dir, args, setupinfo);
  }

  public async updateKeyValueConfig(
    file: string,
    pairs: RenpyAndroidProperties,
    additional_pairs: RenpyAndroidProperties = {}
  ): Promise<RenpyAndroidProperties> {
    const content: RenpyAndroidProperties = (await is_promise_resolving(fs.access(file)))
      ? stringToAndroidProperties(await fs.readFile(file).toString())
      : {};
    for (const k in pairs) {
      content[k] = pairs[k];
    }
    for (const k in additional_pairs) {
      if (!(k in content)) {
        content[k] = additional_pairs[k];
      }
    }
    await fs.writeFile(file, androidPropertiesToString(content));
    return content;
  }
}
