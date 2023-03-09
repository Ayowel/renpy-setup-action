import * as httpm from '@actions/http-client';
import * as tc from '@actions/tool-cache';
import { OutgoingHttpHeaders } from 'http';
import { GitHubReleaseInfo } from '../../model/github';
import { pickOsValue } from '../../utils';
import { getLogger } from '../parameters';
import { AssetDownload } from './interface';

const logger = getLogger();

export class GitHubAssetDownload implements AssetDownload {
  protected http: httpm.HttpClient;
  protected releases: GitHubReleaseInfo[] | undefined;
  protected api_url: string;
  protected auth_token: string;

  constructor(repo_path = '', token = '') {
    this.http = new httpm.HttpClient('github/ayowel/setup-renpy', undefined, {
      allowRetries: true,
      maxRetries: 3
    });
    this.api_url = `https://api.github.com/repos/${repo_path || 'renpy/renpy'}`;
    this.auth_token = token || process.env.GITHUB_TOKEN || '';
  }

  public async download_dlc(version: string, dlc: string): Promise<string> {
    logger.info(`Download DLC ${dlc} for version ${version} from GitHub Release.`);
    const info = await this.get_release_info(version);
    const sdk_assets = info.assets.filter(a => a.name.match(`-${dlc}\\.`));
    if (sdk_assets.length > 1) {
      logger.error(
        `More that one Ren'Py DLC candidate was found for ${dlc}, this should not happen.`
      );
    }
    return await tc.downloadTool(sdk_assets[0].browser_download_url);
  }

  public async download_installer(version: string): Promise<string> {
    logger.info(`Download installer for version ${version} from GitHub Release.`);
    const info = await this.get_release_info(version);
    const sdk_assets = info.assets.filter(a => a.name.match(/-sdk\./));
    const os_sdk = sdk_assets.filter(a => a.name.endsWith(pickOsValue('zip', 'tar.bz2', 'zip')));
    if (os_sdk.length > 1) {
      logger.error(
        `More that one Ren'Py installer candidate was found, this should not happen. Open an issue on the action's page with your configuration information`
      );
    }
    return await tc.downloadTool(os_sdk[0].browser_download_url);
  }

  public async has_release(version: string): Promise<boolean> {
    return await this.get_release_info(version)
      .then(v => !!v)
      .catch(() => false);
  }

  protected async get_release_info(version: string): Promise<GitHubReleaseInfo> {
    let releases = await this.get_all_releases_info();
    if (version !== 'latest') {
      releases = releases.filter(r => r.tag_name.startsWith(version));
      if (releases.length == 0) {
        throw Error(`Could not find a matching release for version ${version}`);
      }
    }
    return releases[0];
  }

  protected async get_all_releases_info(): Promise<GitHubReleaseInfo[]> {
    if (!this.releases) {
      const url = `${this.api_url}/releases`;
      const response = await this.http.getJson<GitHubReleaseInfo[]>(
        url,
        this.get_request_headers()
      );
      if (!response || !response.result) {
        throw Error(`Could not retrieve releases info from ${url}`);
      }
      this.releases = response.result.filter(release => !release.draft);
    }
    return this.releases;
  }

  protected get_request_headers(): OutgoingHttpHeaders | undefined {
    if (this.auth_token) {
      return { authorization: `Bearer ${this.auth_token}` };
    }
    return undefined;
  }
}
