# Ren'Py setup - install, lint, distribute, and more

[![License](https://img.shields.io/github/license/Ayowel/renpy-setup-action)](https://github.com/Ayowel/renpy-setup-action/blob/master/LICENSE)
[![Latest version](https://img.shields.io/github/v/tag/Ayowel/renpy-setup-action)](https://www.github.com/Ayowel/renpy-setup-action/releases/latest)
[![Coverage](https://img.shields.io/codecov/c/github/Ayowel/renpy-setup-action)](https://app.codecov.io/github/Ayowel/renpy-setup-action/)

This action installs Ren'Py with DLCs and modules and allows you to perform simple actions on your code with it.

**Notable changes in V3**:

* Native cache support, no need to add save/restore steps anymore (Set `cache_strategy` to `none` to restore the old behavior)
* Added support for Live2D SDK install

## Usage

### Basic usage

Install Ren'Py then execute a command of your choosing.
In this example, we lint the project everytime code is pushed to the repository:

```yml
# .github/workflows/lint.yml
name: Lint the Ren'Py project
on:
  push:

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v7
      - name: Install Ren'Py
        uses: Ayowel/renpy-setup-action@v3
        with:
          action: install
      # Update/Replace the step below to do something different
      - name: Lint the game
        uses: Ayowel/renpy-setup-action@v3
        with:
          action: lint
```

### Distribute release packages

After installing, easily build release packages for multiple platforms by providing a comma- or newline-separated list of packages:

```yml
- name: Generate game distribution files
  uses: Ayowel/renpy-setup-action@v3
  with:
    action: distribute
    packages: linux, win
    out_dir: /tmp/target
```

Note that you may specify a file name after the package (except for the special package `all`). If you do, the value of `out_dir` will be ignored for the package and the provided file name will be used instead:

```yml
# Create linux-target/distrib_linux.tar.bz2, /tmp/target/gamename-pc.zip, and /tmp/target/gamename-mac.zip
- uses: Ayowel/renpy-setup-action@v3
  with:
    action: distribute
    packages: |
      linux /tmp/linux-target/distrib_linux
      win, mac
    out_dir: /tmp/target
```
### Lint project

After installing Ren'py, ensure that your code does not have structural issues:

```yml
- name: Run Ren'Py linter
  uses: Ayowel/renpy-setup-action@v3
  with:
    action: lint
```

### Update the game's translation

After installing Ren'Py, use the `translate` action to update the game's translation files:

```yml
- uses: Ayowel/renpy-setup-action@v3
  id: renpy
  with:
    action: translate
    languages: french english
```

### Get layout information

After installing Ren'Py, use the `nothing` action if you just want to get one of the action's outputs, such as the Python installation's path :

```yml
- uses: Ayowel/renpy-setup-action@v3
  id: renpy
  with:
    action: nothing
- name: Display Ren'Py's Python version
  run: ${{ steps.renpy.outputs.python_path }} --version
```

### Build android release

Install Ren'Py with android support and build your android project.

Android builds require that you have Java 8 installed, install it with `actions/setup-java` or provide the `java_home` path input if the environment variables are not all set-up bu you know where the JDK is located.
On GitHub-hosted runner, set the environment variable `ANDROID_NDK_HOME` to the empty string to ensure Ren'Py's NDK does not collide with the one provided by GitHub.

```yml
# .github/workflows/android_build.yml
name: Build android distribution
on:
  workflow_dispatch:

env:
  # Required because GitHub-hosted runners provide an incompatible NDK
  ANDROID_NDK_HOME: ""

jobs:
  android_build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v5
        with:
          distribution: 'temurin'
          java-version: '21'
      - name: Create keystore
        run: base64 -d <<<"$ANDROID_KEYSTORE" >android.keystore
        env:
          ANDROID_KEYSTORE: ${{ secrets.ANDROID_KEYSTORE }}
      - uses: Ayowel/renpy-setup-action@v3
        with:
          action: install
          dlc: rapt
          android_sdk: true
          android_properties: |
            key.alias=android
            key.store.password=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
            key.alias.password=${{ secrets.ANDROID_ALIAS_PASSWORD }}
            key.store=${{ github.workspace }}/android.keystore
      # The project must have a .android.json file
      - uses: Ayowel/renpy-setup-action@v3
        with:
          action: android_build
          build_type: apk
          out_dir: target
```

## Inputs

### Generic inputs

The following inputs are supported in all cases:

| Key | Description | Default value |
| :-- | :---------- | :------------ |
| `action` | What the action should do. Must be one of: `install`, `distribute`, `android_build`, `lint`, `exec`, `translate`, and `nothing`. | `install` |
| `install_dir` | Directory where Ren'Py is/will be installed. <br/> If the action is `install`, the directory may not exist. <br/> If the directory does not exist and the action is not `install`, the step will fail. | `~/.renpy_exec` |
| `game` | Directory where the Ren'Py game is checked out | `.` |
| `java_home` | Where the Java SDK is located (if not in `PATH` and `JAVA_HOME`) |  |

### Install inputs

The following inputs are supported for the `install` action:

| Key | Description | Default value | Example value |
| :-- | :---------- | :------------ | :------------ |
| `dlc` | Comma/space-separated list of Ren'Py DLCs to install. | | `steam rapt` |
| `live2d_native` | Url or path of a live2d release to install. |  | `https://cubism.live2d.com/sdk-native/bin/CubismSdkForNative-5-r.5.zip` |
| `live2d_web` | Url or path of a live2d release to install. |  | `https://cubism.live2d.com/sdk-web/bin/CubismSdkForWeb-5-r.5.zip` |
| `update_path` | Whether Ren'Py's directory should be added to the PATH. | `true` |  |
| `version` | Ren'Py version to install. Defaults to the latest GitHub Release. | `latest` | `8` |
| `android_sdk` | Whether to install the Android SDK | `false` | |
| `android_sdk_install_input` | Custom input to provide when installing the sdk. <br/> This is expert configuration, do not use it unless you have established a need for it. |  |  |
| `android_sdk_owner` | If `android_sdk_install_input` is not provided, what company name to use when installing the SDK. |  | `Ayowel` |
| `android_properties` | Configuration properties to use when building android releases. |  |  |
| `android_aab_properties` | Override `android_properties` for aab builds. |  |  |
| `android_apk_properties` | Override `android_properties` for aab builds. |  |  |
| `use_github_releases` | Whether to download release assets from GitHub. <br/> Please only set this to `false` if you actually have issues when pulling releases from GitHub. | `true` | |
| `github_releases_repo` | The source repository to use for GitHub releases. | `renpy/renpy` |  |
| `github_token` | The GitHub token to use to query the api. Defaults to the workflow's token. | `${{ github.token }}` ||
| `use_cdn` | Whether to download release assets directly from Ren'Py's CDN. | `true` |  |
| `cdn_url` | The base URL of the CDN that provides Ren'Py's releases' assets. | `https://www.renpy.org/dl` |  |
| `cache_strategy` | The caching strategy to use. Must be one of `all`, `none`, `save`, `load`. | `all` |  |
| `cache_key` | The cache key to use. If not provided, it will be generated based on inputs. |  |  |

### Distribute inputs

The following inputs are supported for the `distribute` action:

| Key | Description | Default value | Example value |
| :-- | :---------- | :------------ | :------------ |
| `packages` | Comma/newline-separated list of packages that should be built. | `all` |  |
| `out_dir`| Directory where generated packages should be saved. |  | `target` |

### Android build inputs

The following inputs are supported for the `android_build` action:

| Key | Description | Default value | Example value |
| :-- | :---------- | :------------ | :------------ |
| `build_type` | Whether to build an Universak APK (`apk`) or a Play Bundle (`aab`). | `apk` |  |
| `out_dir` | Directory where generated packages should be saved. |  | `target` |

### Translate inputs

The following inputs are supported for the `translate` action:

| Key | Description | Default value | Example value |
| :-- | :---------- | :------------ | :------------ |
| `languages` | The languages for which translations should be created or updated |  | `french, english` |

### Exec inputs

The following inputs are supported for the `exec` action:

| Key | Description | Default value |
| :-- | :---------- | :------------ |
| `run` | The arguments to provide to Ren'Py in the command-line. | `--help` |

## Output

The following outputs are available for all actions.

| Output name | Description |
| :---: | :--- |
| __`install_dir`__ | Path to Ren'Py's install directory |
| __`renpy_path`__ | Path to the Ren'Py executable |
| __`python_path`__ | Path to the Python executable embedded in Ren'Py |

### Install-only outputs

The following outputs are only available for the `install` action:

| Output name | Description |
| :---: | :--- |
| __`cache_hit`__ | Wether a cached Ren'Py install was found |
| __`cache_save`__ | Wether the Ren'Py install was saved to cache |
| __`cache_key`__ | The key used to save the Ren'Py install to cache |
