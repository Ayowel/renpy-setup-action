import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RenpyExecutor } from './controller/executor';
import { getLogger, parseInputs, writeOutputs, fail } from './adapter/parameters';
import { RenpyInstaller } from './controller/installer';
import { RenPyInputsSupportedAction, RenpyOutputs } from './model/parameters';
import { getRenpyPythonPath, getRenpyExecPath } from './adapter/system';

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
        const installer = new RenpyInstaller(opts.install_dir, opts.install_opts.version);
        await installer.install(opts.install_opts);
        logger.endGroup();
        break;
      case RenPyInputsSupportedAction.Distribute:
        logger.startGroup('Generate distribution files');
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
