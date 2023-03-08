import { GitHubAssetDownload } from '../adapter/download/github';
import { MultiAssetDownload } from '../adapter/download/interface';
import { RenpyAssetDownload } from '../adapter/download/renpy';
import { RenpyAssetDownloaderOptions } from '../model/parameters';

export class AssetDownloader extends MultiAssetDownload {
  constructor(conf: RenpyAssetDownloaderOptions) {
    super();
    // Order is important for resolution
    if (conf.use_github) {
      this.add_downloader(new GitHubAssetDownload(conf.github_repo));
    }
    if (conf.use_cdn) {
      this.add_downloader(new RenpyAssetDownload(conf.cdn_base_url));
    }
  }
}
