# Ren'Py installer

[![License](https://img.shields.io/github/license/Ayowel/renpy-setup-action)](https://github.com/Ayowel/renpy-setup-action/blob/master/LICENSE)
[![Latest version](https://img.shields.io/github/v/tag/Ayowel/renpy-setup-action)](https://www.github.com/Ayowel/renpy-setup-action/releases/latest)
[![Coverage](https://img.shields.io/codecov/c/github/Ayowel/renpy-setup-action)](https://codecov.io/github/Ayowel/renpy-setup-action/)

This action installs Ren'Py with DLCs and modules and allows you to perform simple actions on your code with it.

## Usage

### Distribute release packages

Easily build release packages for multiple platforms.

```yml
# .github/workflows/distribute.yml
name: Distribute code
on:
  workflow_dispatch:

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          path: project
      - name: Install Ren'Py
        uses: Ayowel/renpy-setup-action@v1.0.0
        with:
          action: install
          version: 8.0.3
      - name: Generate game distribution files
        uses: Ayowel/renpy-setup-action@v1.0.0
        with:
          action: distribute
          game: project
          packages: linux, win
          out_dir: target
```

### Lint project

Ensure that your code does not have structural issues without even running the game.

```yml
# .github/workflows/lint.yml
name: Lint code
on:
  workflow_dispatch:

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          path: project
      - name: Install Ren'Py
        uses: Ayowel/renpy-setup-action@v1.0.0
        with:
          action: install
          version: 8.0.3
      - name: Run Ren'Py linter
        uses: Ayowel/renpy-setup-action@v1.0.0
        with:
          action: lint
          game: project
```

### Install

Or simply install Ren'Py to use commands of your choosing.

```yml
# .github/workflows/install.yml
name: Install Ren'Py
on:
  workflow_dispatch:

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: Ayowel/renpy-setup-action@v1.0.0
        id: renpy
        with:
          action: install
          version: 8.0.3
          dlc: steam
      - run: ${{ steps.renpy.outputs.renpy_path }} --help
```

## Optimization and tips

### Use the cache

You should use the action with caching for best performance. Add the `install_dir` input and cache the corresponding directory with `@actions/cache`.

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
          key: ${{ runner.os }}-renpy-${{ env.RENPY_VERSION }}
      - uses: Ayowel/renpy-setup-action@v1.0.0
        if: steps.cache-renpy.outputs.cache-hit != 'true'
        with:
          action: install
          version: ${{ env.RENPY_VERSION }}
          install_dir: renpy
      - uses: Ayowel/renpy-setup-action@v1.0.0
        with:
          action: lint
          install_dir: renpy
          game: project
```

### Provide distribution files paths

The packages list may contain a path for a generated package. When doing so, the  value `out_dir` will be ignored for the files with a path.
Note that a file extension will automatically be added, so the raw name provided can't be relied upon without gobing the actual file.

In the following example, the linux release will be created in `linux-target/` with a custom name while the windows and mac releases

```yml
# .github/workflows/distribute.yml
name: Distribute code
on:
  workflow_dispatch:

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          path: project
      - uses: Ayowel/renpy-setup-action@v1.0.0
        with:
          action: install
          version: 8.0.3
      - uses: Ayowel/renpy-setup-action@v1.0.0
        with:
          action: distribute
          game: project
          packages: |
            linux linux-target/distrib_linux
            win, mac
          out_dir: target
```

## Inputs

This action supports the following inputs:

```yml
- uses: Ayowel/renpy-setup-action@v1.0.0
  with:
    # What the action should do.
    # Must be one of 'install', 'distribute', and 'lint'
    action: install
    # Directory where Ren'Py is/will be installed.
    # The directory may not exist if the action is install.
    # If the directory does not exist and the action is not
    # 'install', Ren'Py will be installed before running
    # the action.
    install_dir: ~/.renpy_exec
    # Directory of the Ren'Py game
    game: .

    ### INSTALL INPUTS ###
    # Comma/space-separated list of Ren'Py DLCs to install
    dlc: steam
    # Path to a live2d release to install.
    # This option is not supported yet.
    live2d: https://cubism.live2d.com/sdk-native/bin/CubismSdkForNative-4-r.5.1.zip
    # Whether Ren'Py's directory should be added to the PATH
    update_path: false
    # Downloaded Ren'Py version when installing
    version: 8.0.3

    ### DISTRIBUTE INPUTS ###
    # Comma/newline-separated list of packages that should
    # be built
    packages: all
    # Directory where generated packages should be saved
    out_dir: ""
```

## Output

| Output name | Description |
| :---: | :--- |
| __`install_dir`__ | Path to Ren'Py's install directory |
| __`renpy_path`__ | Path to the Ren'Py executable |
| __`python_path`__ | Path to the Python executable embedded in Ren'Py |
