import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { RenpyExecutor } from './controller/executor';
import { getLogger, parseInputs, writeOutputs, fail } from './adapter/parameters';
import { RenpyInstaller } from './controller/installer';
import { RenPyInputsSupportedAction, RenpyInstallOutputs, RenpyOutputs } from './model/parameters';
import { getRenpyPythonPath, getRenpyExecPath } from './adapter/system';
import { AssetDownloader } from './controller/downloader';
import { is_promise_resolving } from './utils';

const logger = getLogger();

export async function main() {
  try {
    if (!['darwin', 'win32', 'linux'].includes(os.platform())) {
      throw Error(`Unsupported platform: ${os.platform()}`);
    }
    const opts = await parseInputs();
    const executor = new RenpyExecutor(opts.install_dir);
    let install_outputs: RenpyInstallOutputs = {};

    if (opts.java_home) {
      /*
        Update environment to ensure child processes have
        the right configuration when commands should rely
        on android
      */
      process.env['JAVA_HOME'] = opts.java_home;
      process.env['PATH'] = `${path.join(opts.java_home, 'bin')}${path.delimiter}${
        process.env['PATH']
      }`;
    }

    switch (opts.action) {
      case RenPyInputsSupportedAction.Install:
        logger.startGroup("Install Ren'Py");
        const downloader = new AssetDownloader(opts.downloader_opts);
        const installer = new RenpyInstaller(
          opts.install_dir,
          opts.install_opts.version,
          downloader
        );
        install_outputs = await installer.install(opts.install_opts);
        logger.endGroup();
        break;
      case RenPyInputsSupportedAction.Distribute:
        logger.startGroup('Generate distribution files');
        const old_game_dir = path.join(opts.game_dir, 'old-game');
        if (
          await fs
            .access(old_game_dir)
            .then(() => fs.readdir(old_game_dir))
            .then(
              files => files.length == 0,
              () => false
            )
        ) {
          logger.error(
            `The game in ${opts.game_dir} contains an old-game dir, but it is empty. This is probably an error`
          );
        }
        await executor.distribute(opts.game_dir, opts.distribute_opts);
        logger.endGroup();
        break;
      case RenPyInputsSupportedAction.Lint:
        logger.startGroup('Lint project');
        await executor.lint(opts.game_dir, opts.lint_opts);
        logger.endGroup();
        break;
      case RenPyInputsSupportedAction.AndroidBuild:
        logger.startGroup('Build android project files');
        const android_config_file = path.join(opts.game_dir, '.android.json');
        if (await is_promise_resolving(fs.access(android_config_file))) {
          try {
            const android_config = JSON.parse(
              await fs.readFile(android_config_file, { encoding: 'utf-8' })
            );
            if (android_config['update_keystores'] !== false) {
              logger.warning(
                "The file .android.json does not set 'update_keystores' to false. It is recommended that you set this key to false to avoid build issues."
              );
            }
          } catch {
            logger.error('Failed to verify .android.json file');
          }
        } else {
          logger.error('Missing file .android.json in game directory');
        }
        await executor.android_build(opts.game_dir, opts.android_build_opts);
        logger.endGroup();
        break;
      case RenPyInputsSupportedAction.Exec:
        logger.startGroup('Execute command');
        await executor.exec(opts.exec_opts);
        logger.endGroup();
        break;
      case RenPyInputsSupportedAction.Nothing:
        break;
      case RenPyInputsSupportedAction.Translate:
        logger.startGroup('Translate project');
        await executor.translate(opts.game_dir, opts.translate_opts);
        logger.endGroup();
        break;
      default:
        throw Error(`Unsupported action ${opts.action}`);
    }

    logger.info('Write action outputs');
    const renpy_dir = await fs.realpath(executor.getDirectory());
    const outputs: RenpyOutputs = {
      install_dir: renpy_dir,
      python_path: await getRenpyPythonPath(renpy_dir),
      renpy_path: await getRenpyExecPath(renpy_dir),
      ...install_outputs
    };
    writeOutputs(outputs);
  } catch (error) {
    fail(error as Error);
  }
}

if (
  (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) ||
  (typeof require === 'undefined' && typeof module === 'undefined' && import.meta.main)
) {
  main();
}
