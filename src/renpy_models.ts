export type RenpyRootFile = {
  //"monkeypatch"?: string,
  [id: string]: {
    sums_url: string;
    version?: number | string;
    zsync_url: string;
    json_url: string;
    pretty_version: string;
    sums_size: number;
    digest: string;
  };
};

export type RenpyDlcUpdateInfo = {
  version: string | number;
  pretty_version?: string;
  base_name?: string;
  files: string[];
  directories: string[];
  xbit: string[];
};

export type RenpyUpdateFile = {
  [id: string]: RenpyDlcUpdateInfo;
};

export type RenpyDlcUpdateCurrent = {
  [id: string]: any;
};
