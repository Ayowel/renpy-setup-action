import * as fs from 'fs';
import * as os from 'os';
import { RenpyExecutor } from './controller/executor';
import { getLogger, parseInputs, writeOutputs, fail } from './adapter/parameters';
import { RenpyInstaller } from './controller/installer';
import { RenpyDistributeOptions, RenpyLintOptions, RenpyOutputs } from './model/parameters';

const logger = getLogger();

async function main() {
  try {
    if (!['win32', 'linux'].includes(os.platform())) {
      throw Error(`Unsupported platform: ${os.platform()}`);
    }
    const opts = parseInputs();
    const executor = new RenpyExecutor(opts.install_dir);

    if (opts.action == 'install' || !fs.existsSync(opts.install_dir)) {
      logger.startGroup("Install Ren'Py");
      if (opts.action != 'install') {
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

    const outputs: RenpyOutputs = {
      install_dir: fs.realpathSync(executor.getDirectory()),
      python_path: fs.realpathSync(executor.getPythonPath()),
      renpy_path: fs.realpathSync(executor.getRenpyPath())
    };

    switch (opts.action) {
      case 'install':
        break;
      case 'distribute':
        logger.startGroup('Generate distribution files');
        await executor.distribute(opts.game_dir, opts.distribute_opts as RenpyDistributeOptions);
        logger.endGroup();
        break;
      case 'lint':
        logger.startGroup('Lint project');
        await executor.lint(opts.game_dir, opts.lint_opts as RenpyLintOptions);
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
