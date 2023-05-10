export interface AssetDownload {
  download_installer: (version: string) => Promise<string>;
  download_dlc: (version: string, dlc: string) => Promise<string>;
  has_release: (version: string) => Promise<boolean>;
}

export class MultiAssetDownload implements AssetDownload {
  protected downloaders: AssetDownload[];
  constructor() {
    this.downloaders = [];
  }

  public add_downloader(downloader: AssetDownload) {
    this.downloaders.push(downloader);
    return this;
  }

  public async download_installer(version: string): Promise<string> {
    for (const dl of this.downloaders) {
      if (await dl.has_release(version)) {
        return await dl.download_installer(version);
      }
    }
    throw Error(`Ren'Py version ${version} could not be found in any of the supported remotes.`);
  }
  public async download_dlc(version: string, dlc: string): Promise<string> {
    for (const dl of this.downloaders) {
      if (await dl.has_release(version)) {
        return await dl.download_dlc(version, dlc);
      }
    }
    throw Error(`Ren'Py version ${version} could not be found in any of the supported remotes.`);
  }
  public async has_release(version: string): Promise<boolean> {
    for (const dl of this.downloaders) {
      if (await dl.has_release(version)) {
        return true;
      }
    }
    return false;
  }
}
