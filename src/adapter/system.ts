import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { pickOsValue } from '../utils';
import { getLogger } from './parameters';

const logger = getLogger();

enum RenpyExecutableName {
  Linux = 'renpy.sh',
  Mac = 'renpy.sh',
  Windows = 'renpy.exe'
}

export function getRenpyPythonPath(directory: string): string {
  const os = pickOsValue('windows', 'linux', 'mac');
  const ext = pickOsValue('.exe', '', '');
  const python_paths = [
    `lib/py3-${os}-x86_64/python${ext}`,
    `lib/py2-${os}-x86_64/python${ext}`,
    `lib/${os}-x86_64/python${ext}`
  ];
  for (const p of python_paths) {
    const candidate_path = path.join(directory, p);
    if (fs.existsSync(candidate_path)) {
      return candidate_path;
    }
  }
  throw Error("Failed to find Python executable in Ren'Py directory.");
}

export function getRenpyExecPath(directory: string): string {
  const exec_name = pickOsValue(
    RenpyExecutableName.Windows,
    RenpyExecutableName.Linux,
    RenpyExecutableName.Mac
  );
  const renpy_path = path.join(directory, exec_name);
  if (fs.existsSync(renpy_path)) {
    return renpy_path;
  } else {
    throw Error("Failed to find Ren'Py executable in Ren'Py directory.");
  }
}

export async function exec(
  executable: string,
  args: string | string[],
  opts: cp.ExecOptions = {},
  stdin = ''
): Promise<[string, string]> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    logger.debug(`Execute command "${executable}" ${args}`);
    let child: cp.ChildProcess;
    if (typeof args !== 'string') {
      child = cp.spawn(executable, args, opts);
    } else {
      child = cp.exec(`${executable} ${args}`, opts);
    }
    if (child.stdin) {
      child.stdin.end(stdin);
    }
    const log = (logger: (m: string) => void, message: string | string[]) => {
      const messages = typeof message == 'string' ? message.split('\n') : message;
      messages.forEach(line => {
        logger(`${child.pid} ${line}`);
      });
    };
    if (child.stdout) {
      child.stdout.on('data', data => {
        stdout += data;
        log(logger.debug, '' + data);
      });
    }
    if (child.stderr) {
      child.stderr.on('data', data => {
        stderr += data;
        log(logger.debug, '' + data);
      });
    }
    child.on('close', status => {
      if (status == 0) {
        resolve([stdout, stderr]);
      } else {
        log(
          logger.error,
          [
            `Child process ${child.pid} failed with error code ${status}`,
            `${stdout}`,
            `${stderr}`
          ].join('\n\n')
        );
        reject(Error(`${child.pid} Failed to execute command "${executable}" ${args}`));
      }
    });
  });
}

export async function renpyExec(
  renpy_dir: string,
  args: string | string[]
): Promise<[string, string]> {
  return exec(getRenpyExecPath(renpy_dir), args);
}

export async function renpyPythonExec(
  renpy_dir: string,
  args: string | string[],
  stdin = ''
): Promise<[string, string]> {
  return exec(fs.realpathSync(getRenpyPythonPath(renpy_dir)), args, { cwd: renpy_dir }, stdin);
}
