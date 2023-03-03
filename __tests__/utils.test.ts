import os from 'os';
import * as utils from '../src/utils';

describe('utils.stringToBool properly parses strings', () => {
  it.each([
    ['true', true, true],
    ['true', false, true],
    ['false', true, false],
    ['false', false, false],
    ['', true, true],
    ['', false, false]
  ])("String '%s' with default %s returns %s", (str, def, expected) => {
    expect(utils.stringToBool(str, def)).toBe(expected);
  });

  test('Providing a non-boolean string throws an error', () => {
    expect(() => utils.stringToBool('NotABool', false)).toThrow();
  });
});

describe('utils.pickOsValue changes its return value depending on the platform', () => {
  let current_platform: NodeJS.Platform = os.platform();
  beforeEach(() => {
    current_platform = os.platform();
    jest.spyOn(os, 'platform').mockImplementation(() => current_platform);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    ['win32', 0],
    ['linux', 1],
    ['darwin', 2]
  ] as [NodeJS.Platform, number][])(
    'On %s platforms, the parameter %s is returned',
    (pf, index) => {
      current_platform = pf;
      const params: [string, string, string] = ['param1', 'param2', 'param3'];
      expect(utils.pickOsValue(...params)).toBe(params[index]);
    }
  );

  test('Throws on unsupported platforms', () => {
    current_platform = 'aix';
    expect(() => utils.pickOsValue(1, 2, 3)).toThrow();
  });
});
