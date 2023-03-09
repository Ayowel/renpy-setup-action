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

export type RenpyAndroidProperties = {
  [id: string]: string;
};

export function androidPropertiesToString(props: RenpyAndroidProperties): string {
  return Object.keys(props)
    .sort()
    .map(k => `${k}=${props[k]}`)
    .join('\n');
}

export function stringToAndroidProperties(str: string): RenpyAndroidProperties {
  // If a line does not contain an '=' sign, it is silently ignored
  return str
    .split('\n')
    .map(s => s.trim().split('='))
    .filter(s => s.length >= 2)
    .reduce((p, s) => {
      const key = s.splice(0, 1)[0].trim();
      const value = s.join('=').trim();
      p[key] = value;
      return p;
    }, {} as RenpyAndroidProperties);
}
