import * as fs from 'fs';
import * as path from 'path';

import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import { getLogger } from '../adapter/parameters';
import { renpyPythonExec } from '../adapter/system';
import { RenpyInstallerOptions } from '../model/parameters';
import {
  RenpyAndroidProperties,
  androidPropertiesToString,
  stringToAndroidProperties
} from '../model/renpy';
import { AssetDownload } from '../adapter/download/interface';

const logger = getLogger();

export class RenpyInstaller {
  protected version: string;
  protected install_dir: string;
  protected downloader: AssetDownload;

  constructor(directory: string, version: string, downloader: AssetDownload) {
    this.version = version;
    this.install_dir = directory;
    this.downloader = downloader;
  }

  public async install(opts: RenpyInstallerOptions) {
    logger.info(`Installing Ren'Py version ${opts.version}`);
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

    if (opts.live2d_url) {
      logger.info('Install Live2D');
      logger.error('Live2D is not supported yet.');
    } else {
      logger.debug('No configured Live2D source');
    }

    if (opts.update_path) {
      core.addPath(this.install_dir);
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
        if (!fs.existsSync(updated_keys['key.store'])) {
          logger.warning(
            `The keystore path in ${target_pair[0]} does not appear to map to an existing keystore file (${updated_keys['key.store']}).`
          );
        }
      }
    }
  }

  public async installCore() {
    if (fs.existsSync(this.install_dir)) {
      throw Error(
        `The Ren'Py install directory exists before install. This is not supported. (path: ${this.install_dir})`
      );
    }

    logger.info("Downloading Ren'Py archive");
    const core_archive = await this.downloader.download_installer(this.version);
    logger.debug(`Start extraction of Ren'Py archive ${core_archive}`);
    fs.mkdirSync(this.install_dir, { recursive: true });
    // Windows and Mac tar supports zip files
    await tc.extractTar(core_archive, this.install_dir, ['x', '--strip-components=1']);
  }

  public async installDlc(dlc: string) {
    // Download & extract files
    logger.debug(`Download dlc ${dlc}.`);
    const file = await this.downloader.download_dlc(this.version, dlc);
    logger.debug(`Extracting downloaded dlc file.`);
    await tc.extractZip(file, this.install_dir);
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
    const content: RenpyAndroidProperties = fs.existsSync(file)
      ? stringToAndroidProperties(fs.readFileSync(file).toString())
      : {};
    for (const k in pairs) {
      content[k] = pairs[k];
    }
    for (const k in additional_pairs) {
      if (!(k in content)) {
        content[k] = additional_pairs[k];
      }
    }
    fs.writeFileSync(file, androidPropertiesToString(content));
    return content;
  }
}
