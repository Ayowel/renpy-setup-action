import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RenpyExecutor } from './controller/executor';
import { getLogger, parseInputs, writeOutputs, fail } from './adapter/parameters';
import { RenpyInstaller } from './controller/installer';
import { RenPyInputsSupportedAction, RenpyOutputs } from './model/parameters';
import { getRenpyPythonPath, getRenpyExecPath } from './adapter/system';
import { AssetDownloader } from './controller/downloader';

const logger = getLogger();

export async function main() {
  try {
    if (!['darwin', 'win32', 'linux'].includes(os.platform())) {
      throw Error(`Unsupported platform: ${os.platform()}`);
    }
    const opts = parseInputs();
    const executor = new RenpyExecutor(opts.install_dir);

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
        await installer.install(opts.install_opts);
        logger.endGroup();
        break;
      case RenPyInputsSupportedAction.Distribute:
        logger.startGroup('Generate distribution files');
        const old_game_dir = path.join(opts.game_dir, 'old-game');
        if (fs.existsSync(old_game_dir) && fs.readdirSync(old_game_dir).length == 0) {
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
        if (fs.existsSync(android_config_file)) {
          try {
            const android_config = JSON.parse(
              fs.readFileSync(android_config_file, { encoding: 'utf-8' })
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
    const renpy_dir = fs.realpathSync(executor.getDirectory());
    const outputs: RenpyOutputs = {
      install_dir: renpy_dir,
      python_path: getRenpyPythonPath(renpy_dir),
      renpy_path: getRenpyExecPath(renpy_dir)
    };
    writeOutputs(outputs);
  } catch (error) {
    fail(error as Error);
  }
}

if (require.main === module) main();
