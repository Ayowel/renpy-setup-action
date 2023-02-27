import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RenpyExecutor } from './controller/executor';
import { getLogger, parseInputs, writeOutputs, fail } from './adapter/parameters';
import { RenpyInstaller } from './controller/installer';
import { RenPyInputsSupportedAction, RenpyOutputs } from './model/parameters';
import { getRenpyPythonPath, getRenpyExecPath } from './adapter/system';

const logger = getLogger();

async function main() {
  try {
    if (!['win32', 'linux'].includes(os.platform())) {
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

    if (opts.action == RenPyInputsSupportedAction.Install || !fs.existsSync(opts.install_dir)) {
      logger.startGroup("Install Ren'Py");
      if (opts.action != RenPyInputsSupportedAction.Install) {
        // @deprecated This section will be moved to the switch statement
        logger.error(
          "Implicit Ren'Py installation is deprecated and will be removed in a future release.\n" +
            'Add an `install` action step to your job.'
        );
      }
      const installer = new RenpyInstaller(opts.install_dir, opts.install_opts.version);
      await installer.install(opts.install_opts);
      logger.endGroup();
    }

    const renpy_dir = fs.realpathSync(executor.getDirectory());
    const outputs: RenpyOutputs = {
      install_dir: renpy_dir,
      python_path: getRenpyPythonPath(renpy_dir),
      renpy_path: getRenpyExecPath(renpy_dir)
    };

    switch (opts.action) {
      case RenPyInputsSupportedAction.Install:
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
      default:
        throw Error(`Unsupported action ${opts.action}`);
    }

    logger.info('Write action outputs');
    writeOutputs(outputs);
  } catch (error) {
    fail(error as Error);
  }
}

main();
