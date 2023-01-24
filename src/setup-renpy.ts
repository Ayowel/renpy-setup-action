import { getLogger, parseInputs, writeOutputs, fail } from './io';
import { RenpyInstaller } from './installer';

const logger = getLogger();

async function main() {
  try {
    const opts = parseInputs();

    logger.startGroup("Install Ren'Py components");
    const installer = new RenpyInstaller(opts);
    await installer.load();
    logger.info(`Installing Ren'Py version ${opts.version}`);
    await installer.installCore();
    logger.endGroup();

    logger.startGroup('Install DLCs');
    if (opts.dlc_list.length > 0) {
      for (const dlc of opts.dlc_list) {
        logger.info(`Installing DLC ${dlc}.`);
        installer.installDlc(dlc);
      }
    } else {
      logger.info('No DLC to install.');
    }
    logger.endGroup();

    logger.startGroup('Install Live2D');
    if (opts.live2d_url) {
      logger.error('Live2D is not supported yet.');
    } else {
      logger.info('Skip Live2D install');
    }
    logger.endGroup();

    logger.startGroup('Write action outputs');
    writeOutputs({
      install_dir: installer.getEffectiveDir(),
      python_path: installer.getPythonPath(),
      renpy_path: installer.getRenpyPath()
    });
    logger.endGroup();
  } catch (error) {
    fail(error as Error);
  }
}

main();
