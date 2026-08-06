import * as httpm from '@actions/http-client';
import * as tc from '@actions/tool-cache';
import { OutgoingHttpHeaders } from 'http';
import { GitHubApiError, GitHubReleaseInfo } from '../../model/github';
import { pickOsValue } from '../../utils';
import { getLogger } from '../parameters';
import { AssetDownload } from './interface';

const logger = getLogger();

const GITHUB_RELEASE_LIST_API_THRESHOLD = 1000;

export class GitHubAssetDownload implements AssetDownload {
  protected http: httpm.HttpClient;
  /** Local releases list cache to avoid re-requesting */
  protected releases: GitHubReleaseInfo[];
  /** Next page to reach when requesting the GitHub releases list API */
  protected current_page: number = 1;
  /** Number of releases to get when requesting the GitHub releases list API */
  protected releases_per_page: number = 100;
  /** Base URL to use when requesting the GitHub API */
  protected api_url: string;
  /** Authentication token to use when accessing the GitHub API */
  protected auth_token: string;

  constructor(repo_path = '', token = '') {
    this.http = new httpm.HttpClient('github/ayowel/setup-renpy', undefined, {
      allowRetries: true,
      maxRetries: 3
    });
    this.api_url = `https://api.github.com/repos/${repo_path || 'renpy/renpy'}`;
    this.auth_token = token || process.env.GITHUB_TOKEN || '';
    this.releases = [];
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
    /** The resolved release's information */
    let release: GitHubReleaseInfo | undefined = undefined;
    /** Find a specific release in the list and return false once it does */
    const is_release_missing = (releases: GitHubReleaseInfo[]) => {
      release =
        version === 'latest'
          ? releases[0]
          : releases.filter(r => r.tag_name.startsWith(version)).shift();
      return release === undefined;
    };

    if (is_release_missing(this.releases)) {
      const url = `${this.api_url}/releases/tags/${version}`;
      const r = await this.http.getJson<GitHubReleaseInfo | GitHubApiError>(
        url,
        this.get_request_headers()
      );
      if (r && r.result && 'tag_name' in r.result) {
        this.releases.push(r.result);
        return (release = r.result);
      }
      await this.get_all_releases_info(is_release_missing);
    }
    if (release === undefined) {
      throw Error(`Could not find a matching release for version ${version}`);
    }
    return release;
  }

  protected async get_all_releases_info(
    while_condition: (_: GitHubReleaseInfo[]) => boolean = () => true
  ): Promise<GitHubReleaseInfo[]> {
    let last_releases = this.releases;
    while (
      while_condition(last_releases) &&
      this.releases_per_page * this.current_page < GITHUB_RELEASE_LIST_API_THRESHOLD
    ) {
      const url = `${this.api_url}/releases?per_page=${this.releases_per_page}&page=${this.current_page}`;
      const response = await this.http.getJson<GitHubReleaseInfo[] | GitHubApiError>(
        url,
        this.get_request_headers()
      );

      if (!response || response.result === null || 'status' in response.result) {
        throw Error(`Could not retrieve releases info from ${url}`);
      }
      if (response.result.length === 0) {
        // We've reached the end of all releases, artificially increase the current page to avoir coming back and return
        this.current_page =
          Math.floor(GITHUB_RELEASE_LIST_API_THRESHOLD / this.releases_per_page) + 1;
        break;
      }
      last_releases = response.result.filter(release => !release.draft);
      this.releases = this.releases.concat(last_releases);
      this.current_page += 1;
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
