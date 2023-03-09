import * as httpm from '@actions/http-client';
import * as tc from '@actions/tool-cache';
import { RenpyRootFile } from '../../model/renpy';
import { pickOsValue } from '../../utils';
import { getLogger } from '../parameters';
import { AssetDownload } from './interface';

const logger = getLogger();

export class RenpyAssetDownload implements AssetDownload {
  protected http: httpm.HttpClient;
  protected updates_info: { [id: string]: RenpyRootFile };
  protected base_url: string;

  constructor(base_url = '') {
    this.http = new httpm.HttpClient('github/ayowel/setup-renpy', undefined, {
      allowRetries: true,
      maxRetries: 3
    });
    this.updates_info = {};
    this.base_url = base_url || 'https://www.renpy.org/dl';
  }

  public async download_installer(version: string): Promise<string> {
    logger.info(`Download installer for version ${version} from CDN.`);
    const info = await this.get_release_info(version);
    const sdk_url = `${this.base_url}/${version}/${info.sdk.zsync_url.slice(0, -5)}${pickOsValue(
      'zip',
      'tar.bz2',
      'zip'
    )}`;
    return await tc.downloadTool(sdk_url);
  }

  public async download_dlc(version: string, dlc: string): Promise<string> {
    logger.info(`Download DLC ${dlc} for version ${version} from CDN.`);
    const info = await this.get_release_info(version);
    if (!info[dlc]) {
      throw Error(`Could not find dlc ${dlc} for Ren'Py version ${version}`);
    }
    const sdk_url = `${this.base_url}/${version}/${info[dlc].zsync_url.slice(0, -5)}zip`;
    return await tc.downloadTool(sdk_url);
  }

  public async has_release(version: string): Promise<boolean> {
    try {
      return !!(await this.get_release_info(version));
    } catch {
      return false;
    }
  }

  protected async get_release_info(version: string): Promise<RenpyRootFile> {
    if (!this.updates_info[version]) {
      const url = `${this.base_url}/${version}/updates.json`;
      const response = await this.http.getJson<RenpyRootFile>(url);
      if (!response || !response.result) {
        throw Error(`Could not retrieve releases info from ${url}`);
      }
      this.updates_info[version] = response.result;
    }
    return this.updates_info[version];
  }
}
