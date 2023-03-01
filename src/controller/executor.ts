import * as fs from 'fs';
import * as path from 'path';

import { getLogger } from '../adapter/parameters';
import { renpyExec } from '../adapter/system';
import {
  RenpyAndroidBuildOptions,
  RenpyAndroidBuildTypes,
  RenpyDistributeOptions,
  RenpyExecOptions,
  RenpyLintOptions
} from '../model/parameters';

const logger = getLogger();

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
      await renpyExec(this.directory, args);
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
      await renpyExec(this.directory, args);
      logger.info('Done');
    }
  }

  public async lint(game: string, opts: RenpyLintOptions) {
    const [stdout, stderr] = await renpyExec(this.directory, [game, 'lint', '--error-code']);
    logger.info(stdout);
    logger.warning(stderr);
  }

  public async android_build(game: string, opts: RenpyAndroidBuildOptions) {
    logger.info(`Building android distribution`);
    // Prepare command args
    const args = ['', 'android_build', game];
    if (opts.target_dir) {
      args.push('--destination', opts.target_dir);
    }
    if (opts.build_type === RenpyAndroidBuildTypes.PlayBundle) {
      args.push('--bundle');
    }
    // Execute command and cleanup
    await renpyExec(this.directory, args);
    logger.info('Done');
  }

  public async exec(opts: RenpyExecOptions): Promise<[string, string]> {
    logger.info(`Running Ren'Py with arguments: ${opts.run}`);
    return await renpyExec(this.directory, opts.run);
  }

  public getDirectory(): string {
    return this.directory;
  }
}
