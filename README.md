# Ren'Py installer

[![License](https://img.shields.io/github/license/Ayowel/renpy-setup-action)](https://github.com/Ayowel/renpy-setup-action/blob/master/LICENSE)
[![Latest version](https://img.shields.io/github/v/tag/Ayowel/renpy-setup-action)](https://www.github.com/Ayowel/renpy-setup-action/releases/latest)

This action installs Ren'Py with DLCs and modules.
Ren'Py may then be used from the command-line to lint or build your project.

## Inputs

The step configuration looks like this:

```yml
- uses: Ayowel/renpy-setup-action@v0.1.0
  with:
    # The base Ren'Py version to download.
    version: 8.0.3
    # Any Ren'Py DLC that should be added to the installation.
    # If listing more than one dlc, separate them with commas.
    dlc: steam
    # The directory where Ren'Py will be installed.
    # The directory may not exist when the action runs.
    install_dir: renpy/
    # Path to the live2d release that should be installed.
    # This option is not supported yet.
    live2d: https://cubism.live2d.com/sdk-native/bin/CubismSdkForNative-4-r.5.1.zip
```

## Output

| Output name | Description |
| :---: | :--- |
| __`install_dir`__ | Path to Ren'Py's install directory |
| __`renpy_path`__ | Path to the Ren'Py executable |
| __`python_path`__ | Path to the python executable embedded in Ren'Py |

## Usage

To minimize the action runtime, we recommend to cache the generated directory. When doing so, output values can't be used as the action may not run:

```yml
# .github/workflows/lint.yml
name: Lint code
on:
  push:
env:
  RENPY_VERSION: 8.0.3

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          path: project
      - uses: actions/cache@v3
        id: cache-renpy
        with:
          path: renpy
          key: ${{ runner.os }}-renpy
      - uses: Ayowel/renpy-setup-action@v0.1.0
        if: steps.cache-renpy.outputs.cache-hit != 'true'
        with:
          version: ${{ env.RENPY_VERSION }}
          dlc: steam
          install_dir: renpy
      - name: Run Ren'Py linter
        run: |
          renpy/renpy.sh project lint
```

You may also use the action without caching, however the action will take between 30 seconds and 1 minute more:

```yml
# .github/workflows/lint.yml
name: Lint code

on:
  push:

env:
  RENPY_VERSION: 8.0.3

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: Ayowel/renpy-setup-action@v0.1.0
        if: steps.cache-renpy.outputs.cache-hit != 'true'
        id: renpy
        with:
          version: ${{ env.RENPY_VERSION }}
          dlc: steam
      - name: Run Ren'Py linter
        run: |
          ${{ steps.renpy.outputs.renpy_path }} . lint
```
