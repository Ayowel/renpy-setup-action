import fs from 'fs';
import os from 'os';
import path from 'path';

import * as core from '@actions/core';

import { RenpyInstallerOptions } from './models';
import { RenpyInstaller } from './installer';

async function main() {
  try {
    /* Get inputs */
    const version = core.getInput('version');
    let install_dir = core.getInput('install_dir');

    core.startGroup("Install Ren'Py components");
    let opts: RenpyInstallerOptions = {
      version,
      dlc_list: core
        .getInput('dlc')
        .split(',')
        .map(v => v.trim())
        .filter(s => !!s),
      live2d_url: core.getInput('live2d'),
      install_dir: install_dir ? install_dir : path.join(os.homedir(), '.renpy_exec', version)
    };

    const installer = new RenpyInstaller(opts);
    await installer.load();
    core.info(`Installing Ren'Py version ${version}`);
    await installer.installCore();
    core.endGroup();

    core.startGroup('Install DLCs');
    if (opts.dlc_list.length > 0) {
      for (const dlc of opts.dlc_list) {
        core.info(`Installing DLC ${dlc}.`);
        installer.installDlc(dlc);
      }
    } else {
      core.info('No DLC to install.');
    }
    core.endGroup();

    core.startGroup('Install Live2D');
    if (opts.live2d_url) {
      core.error('Live2D is not supported yet.');
    } else {
      core.info('Skip Live2D install');
    }
    core.endGroup();

    core.startGroup('Write action outputs');
    core.setOutput('install_dir', installer.getEffectiveDir());
    core.setOutput('python_path', installer.getPythonPath());
    core.setOutput('renpy_path', installer.getRenpyPath());
    core.endGroup();
  } catch (error) {
    core.setFailed(error as Error);
  }
}

main();
