import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from './io';
import { RenpyDistributeOptions, RenpyLintOptions } from './models';
import { pickOsValue } from './utils';

const logger = getLogger();

enum RenpyExecutableName {
  Linux = 'renpy.sh',
  Mac = 'renpy.dmg',
  Windows = 'renpy.exe'
}

export class RenpyExecutor {
  private directory: string;

  constructor(directory: string) {
    this.directory = directory;
  }

  public async distribute(game: string, opts: RenpyDistributeOptions) {
    const generic_pkg = opts.packages.filter(s => typeof s == 'string') as string[];
    const targeted_pkg = opts.packages.filter(s => typeof s != 'string') as [string, string][];

    if (generic_pkg.length > 0) {
      const args = ['', 'distribute', game];
      generic_pkg.forEach(p => args.push('--package', p as string));
      if (opts.target_dir) {
        args.push('--destination', opts.target_dir);
      }
      logger.info(`Building distributions for ${generic_pkg}`);
      await this.execute(args);
      logger.info('Done');
    }
    for (const pkg_info of targeted_pkg) {
      const args = ['', 'distribute', game];
      args.push('--package', pkg_info[0]);
      args.push('--packagedest', pkg_info[1]);
      const target_dir = path.dirname(pkg_info[1]);
      if (target_dir) {
        fs.mkdirSync(target_dir, { recursive: true });
      }
      logger.info(`Building distribution for ${pkg_info[0]}`);
      await this.execute(args);
      logger.info('Done');
    }
  }

  public async lint(game: string, opts: RenpyLintOptions) {
    const [stdout, stderr] = await this.execute([game, 'lint', '--error-code']);
    logger.info(stdout);
    logger.warning(stderr);
  }

  protected async execute(args: string[]): Promise<[string, string]> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      logger.debug(`Execute command "${this.getRenpyPath()}" ${args}`);
      const child = cp.spawn(this.getRenpyPath(), args);
      const log = (logger: (m: string) => void, message: string | string[]) => {
        const messages = typeof message == 'string' ? message.split('\n') : message;
        messages.forEach(line => {
          logger(`${child.pid} ${line}`);
        });
      };
      child.stdout.on('data', data => {
        stdout += data;
        log(logger.debug, '' + data);
      });
      child.stderr.on('data', data => {
        stderr += data;
        log(logger.debug, '' + data);
      });
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
          reject(Error(`${child.pid} Failed to execute command "${this.getRenpyPath()}" ${args}`));
        }
      });
    });
  }

  public getDirectory(): string {
    return this.directory;
  }

  public getPythonPath(): string {
    const os = pickOsValue('windows', 'linux', 'mac');
    const ext = pickOsValue('.exe', '', '');
    const python_paths = [
      `lib/py3-${os}-x86_64/python${ext}`,
      `lib/py2-${os}-x86_64/python${ext}`,
      `lib/${os}-x86_64/python${ext}`
    ];
    for (const p of python_paths) {
      const candidate_path = path.join(this.directory, p);
      if (fs.existsSync(candidate_path)) {
        return candidate_path;
      }
    }
    throw Error("Failed to find Python executable in Ren'Py directory.");
  }

  public getRenpyPath(): string {
    const exec_name = pickOsValue(
      RenpyExecutableName.Windows,
      RenpyExecutableName.Linux,
      RenpyExecutableName.Mac
    );
    const renpy_path = path.join(this.directory, exec_name);
    if (fs.existsSync(renpy_path)) {
      return renpy_path;
    } else {
      throw Error("Failed to find Ren'Py executable in Ren'Py directory.");
    }
  }
}
