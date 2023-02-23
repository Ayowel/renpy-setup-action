import os from 'os';

export function stringToBool(value: string, default_value: boolean): boolean {
  if (!value) {
    return default_value;
  }
  if (!['true', 'false'].includes(value.toLowerCase())) {
    throw Error(`Received an arbitrary string where a boolean was expected: ${value}`);
  }
  return value.toLowerCase() == 'true';
}

export function pickOsValue<T, U, V>(windows: T, linux: U, mac: V): T | U | V {
  switch (os.platform()) {
    case 'linux':
      return linux;
    case 'win32':
      return windows;
    case 'darwin':
      return mac;
    default:
      throw Error(`Unsupported platform: ${os.platform}`);
  }
}
