import * as io from '../src/io';
import * as core from '@actions/core';
import { RenpyOutputs } from '../src/models';

jest.mock('@actions/core');

afterEach(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

test('io.test calls core.setFailed', () => {
  const error_message = 'Test error message';
  io.fail(error_message);
  expect(core.setFailed).toHaveBeenCalledWith(error_message);
});

test('io.getLogger provides a logger that writes to @actions/core', () => {
  const log_message = 'Test info message';
  io.getLogger().info(log_message);
  expect(core.info).toHaveBeenCalledWith(log_message);
});

test('io.writeOutputs uses @actions/core', () => {
  const outputs: RenpyOutputs = {
    install_dir: 'renpy/path',
    renpy_path: 'renpy/path/renpy.sh',
    python_path: 'renpy/path/lib/python'
  };
  io.writeOutputs(outputs);
  expect(core.setOutput).toHaveBeenCalledWith('install_dir', outputs.install_dir);
  expect(core.setOutput).toHaveBeenCalledWith('renpy_path', outputs.renpy_path);
  expect(core.setOutput).toHaveBeenCalledWith('python_path', outputs.python_path);
});

describe('io.parseInputs properly handle input values', () => {
  let input: { [k: string]: string } = {};
  beforeEach(() => {
    input = {
      action: 'install' // default value
    };
    const spyCoreGetInput = jest.spyOn(core, 'getInput');
    spyCoreGetInput.mockImplementation(key => input[key] || '');
  });

  test('Unknown actions throw an error', () => {
    input['action'] = 'unsupportedactionname';
    expect(io.parseInputs).toThrow();
  });

  it.each([
    ['', []],
    ['  steam  ', ['steam']],
    ['steam, renios', ['steam', 'renios']],
    [' steam renios ', ['steam', 'renios']]
  ])('Dlc install list is properly parsed: "%s"', (input_dlc, expected) => {
    input['dlc'] = input_dlc;
    const opts = io.parseInputs();
    expect(opts.action).toBe('install');
    expect(opts.install_opts.dlc_list).toEqual(expected);
  });

  it.each([
    ['', ['all']], // Build all by default
    ['all', ['all']],
    [' win, mac ', ['win', 'mac']],
    ['win\nmac', ['win', 'mac']],
    ['win path/to/win\nmac', [['win', 'path/to/win'], 'mac']],
    [' win, mac   path/to/mac  \n linux ', ['win', ['mac', 'path/to/mac'], 'linux']]
  ])('Package distribution list is properly parsed: "%s"', (input_pkg, expected) => {
    input['action'] = 'distribute';
    input['packages'] = input_pkg;
    const opts = io.parseInputs();
    expect(opts.action).toBe('distribute');
    expect(opts.distribute_opts?.packages).toEqual(expected);
  });

  test('Mapping the "all" package to a file path throws an error', () => {
    input['action'] = 'distribute';
    input['packages'] = 'all path/to/all';
    expect(io.parseInputs).toThrow();
  });

  test('Lint action is properly detected', () => {
    input['action'] = 'lint';
    const opts = io.parseInputs();
    expect(opts.action).toBe('lint');
  });
});
