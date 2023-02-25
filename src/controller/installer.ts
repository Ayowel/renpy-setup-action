import fs from 'fs';
import path from 'path';

import * as core from '@actions/core';
import * as httpm from '@actions/http-client';
import * as tc from '@actions/tool-cache';
import * as tar from 'tar';

import { getLogger } from '../adapter/parameters';
import { RenpyInstallerOptions } from '../model/parameters';
import {
  RenpyRootFile,
  RenpyUpdateFile,
  RenpyDlcUpdateInfo,
  RenpyDlcUpdateCurrent
} from '../model/renpy';
import { pickOsValue } from '../utils';

const logger = getLogger();

export class RenpyInstaller {
  protected http: httpm.HttpClient;
  protected version: string;
  protected install_dir: string;
  protected base_url: string;
  protected meta: RenpyRootFile | undefined;

  constructor(directory: string, version: string) {
    this.http = new httpm.HttpClient('github/ayowel/setup-renpy', undefined, {
      allowRetries: true,
      maxRetries: 3
    });
    this.version = version;
    this.install_dir = directory;
    this.meta = undefined;
    this.base_url = `https://www.renpy.org/dl/${this.version}`;
  }

  public async install(opts: RenpyInstallerOptions) {
    await this.load();
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
  }

  public async load() {
    const update_url = `${this.base_url}/updates.json`;
    const res = await this.http.getJson<RenpyRootFile>(update_url);
    if (res && res.result) {
      this.meta = res.result;
    } else {
      throw Error(`Failed to load meta-information from ${update_url}`);
    }
  }

  public async installCore() {
    if (fs.existsSync(this.install_dir)) {
      throw Error(
        `The Ren'Py install directory exists before install. This is not supported. (path: ${this.install_dir})`
      );
    }

    logger.info("Downloading Ren'Py archive");
    // Windows and Mac tar supports zip files
    const core_file_ext = pickOsValue('zip', 'tar.bz2', 'zip');
    const core_url = `${this.base_url}/renpy-${this.version}-sdk.${core_file_ext}`;
    logger.debug(`Download from ${core_url}`);
    const core_archive = await tc.downloadTool(core_url);
    logger.debug(`Start extraction of Ren'Py archive ${core_archive}`);
    fs.mkdirSync(this.install_dir, { recursive: true });
    const out = await tc.extractTar(core_archive, this.install_dir, ['x', '--strip-components=1']);
  }

  public getMetadata(): RenpyRootFile | undefined {
    return this.meta;
  }

  public async installDlc(dlc: string) {
    if (!this.meta) {
      throw Error('Missing metadata, ensure that you called `load` after init.');
    }
    if (!this.meta[dlc] && !(this.meta[dlc] instanceof String)) {
      throw Error(`The requested DLC does not exist in the update index (${dlc}).`);
    }

    const dlc_info = this.meta[dlc];

    // Get metadata
    const json_url = `${this.base_url}/${dlc_info.json_url}`;
    logger.debug(`Load update metadata for ${dlc} from ${json_url}.`);
    const dlc_content = (await this.http.getJson<RenpyUpdateFile>(json_url)).result;
    if (!dlc_content || !dlc_content[dlc]) {
      throw Error(`Failed to read dlc update file for (${dlc}).`);
    }

    // Download & extract files
    const gz_name = path.basename(dlc_info.json_url, '.json');
    const gz_url = `${this.base_url}/${gz_name}.gz`;
    logger.debug(`Download from ${gz_url}.`);
    const gz_file = await tc.downloadTool(gz_url);
    logger.debug(`Extracting downloaded dlc file.`);

    const file_list = this.buildDlcFilelist(dlc_content[dlc]);
    tar.x(
      {
        cwd: this.install_dir,
        file: gz_file,
        sync: true
      },
      file_list
    );
    await this.updateCurrentJson(dlc_content);
  }

  private buildDlcFilelist(update: RenpyDlcUpdateInfo): string[] {
    const filelist: string[] = [];
    if (update.directories) {
      filelist.push(...update.directories);
    }
    if (update.files) {
      filelist.push(...update.files);
    }
    return filelist;
  }

  private async updateCurrentJson(update: RenpyDlcUpdateCurrent) {
    const update_file = path.join(this.install_dir, 'update', 'current.json');
    const content = JSON.parse(fs.readFileSync(update_file, 'utf-8')) as RenpyDlcUpdateCurrent;
    for (const k in update) {
      content[k] = update[k];
    }
    fs.writeFileSync(update_file, JSON.stringify(content, null, 2));
  }
}
