import fs from 'fs';
import path from 'path';

import * as httpm from '@actions/http-client';
import * as tc from '@actions/tool-cache';
import * as tar from 'tar';

import { getLogger } from './io';
import { RenpyInstallerOptions } from './models';
import {
  RenpyRootFile,
  RenpyUpdateFile,
  RenpyDlcUpdateInfo,
  RenpyDlcUpdateCurrent
} from './renpy_models';

const logger = getLogger();

const python_paths = [
  'lib/py3-linux-x86_64/python',
  'lib/py2-mac-x86_64/python',
  'lib/linux-x86_64/python'
];

export class RenpyInstaller {
  protected http: httpm.HttpClient;
  protected version: string;
  protected install_dir: string;
  protected base_url: string;
  protected meta: RenpyRootFile | undefined;

  constructor(options: RenpyInstallerOptions) {
    this.http = new httpm.HttpClient('ayowel/setup-renpy', undefined, {
      allowRetries: true,
      maxRetries: 3
    });
    this.version = options.version;
    this.install_dir = options.install_dir;
    this.meta = undefined;
    this.base_url = `https://www.renpy.org/dl/${this.version}`;
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
    const core_url = `${this.base_url}/renpy-${this.version}-sdk.tar.bz2`;
    logger.debug(`Download from ${core_url}`);
    const core_archive = await tc.downloadTool(core_url);
    logger.debug(`Start extraction of Ren'Py archive ${core_archive}`);
    fs.mkdirSync(this.install_dir, { recursive: true });
    const out = await tc.extractTar(core_archive, this.install_dir, ['x', '--strip-components=1']);
  }

  public getMetadata(): RenpyRootFile | undefined {
    return this.meta;
  }

  public getEffectiveDir(): string {
    if (fs.existsSync(this.install_dir)) {
      return this.install_dir;
    } else {
      throw Error("Can't get effective directory for Ren'Py as it is not installed yet");
    }
  }

  public getPythonPath(): string {
    const dir = this.getEffectiveDir();
    for (const p of python_paths) {
      const candidate_path = path.join(dir, p);
      if (fs.existsSync(candidate_path)) {
        return candidate_path;
      }
    }
    throw Error("Failed to find Python executable in Ren'Py directory.");
  }

  public getRenpyPath(): string {
    const dir = this.getEffectiveDir();
    const renpy_path = path.join(dir, 'renpy.sh');
    if (fs.existsSync(renpy_path)) {
      return renpy_path;
    } else {
      throw Error("Failed to find Ren'Py executable in Ren'Py directory.");
    }
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
    const out_dir = this.getEffectiveDir();

    const file_list = this.buildDlcFilelist(dlc_content[dlc]);
    tar.x(
      {
        cwd: out_dir,
        file: gz_file,
        sync: true
      },
      file_list
    );
    // TODO: extract update/current.json content and call updateCurrentJson
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

  private updateCurrentJson(update: RenpyDlcUpdateCurrent) {
    const base_dir = this.getEffectiveDir();
    const update_file = path.join(base_dir, 'update', 'current.json');
    const content = JSON.parse(fs.readFileSync(update_file, 'utf-8')) as RenpyDlcUpdateCurrent;
    for (const k in update) {
      content[k] = update[k];
    }
    fs.writeFileSync(update_file, JSON.stringify(content));
  }
}
