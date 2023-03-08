# Ren'Py installer

[![License](https://img.shields.io/github/license/Ayowel/renpy-setup-action)](https://github.com/Ayowel/renpy-setup-action/blob/master/LICENSE)
[![Latest version](https://img.shields.io/github/v/tag/Ayowel/renpy-setup-action)](https://www.github.com/Ayowel/renpy-setup-action/releases/latest)
[![Coverage](https://img.shields.io/codecov/c/github/Ayowel/renpy-setup-action)](https://app.codecov.io/github/Ayowel/renpy-setup-action/)

This action installs Ren'Py with DLCs and modules and allows you to perform simple actions on your code with it.

## Usage

### Basic usage

Install Ren'Py then execute a command of your choosing.
In this example, we use the `exec` action to show Ren'Py's help message after installing:

```yml
# .github/workflows/help.yml
name: Get Ren'Py's help message
on:
  workflow_dispatch:

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
      - name: Install Ren'Py
        uses: Ayowel/renpy-setup-action@v1.2.1
        if: steps.cache-renpy.outputs.cache-hit != 'true'
        with:
          action: install
          install_dir: renpy
      # Update/Replace the step below to do something different
      - name: Print help message
        uses: Ayowel/renpy-setup-action@v1.2.1
        with:
          action: exec
          install_dir: renpy
          run: --help
```

### Distribute release packages

After installing, easily build release packages for multiple platforms:

```yml
- name: Generate game distribution files
  uses: Ayowel/renpy-setup-action@v1.2.1
  with:
    action: distribute
    install_dir: renpy
    game: project
    packages: linux, win
    out_dir: target
```

Note that you may specify a file name after the package. If you do, the value of `out_dir` will be ignored for the package. Note however that the generated file will have an extension added to the path and will not match exactly the provided value:

```yml
- uses: Ayowel/renpy-setup-action@v1.2.1
  with:
    action: distribute
    install_dir: renpy
    game: project
    packages: |
      linux linux-target/distrib_linux
      win, mac
    out_dir: target
```
### Lint project

After installing Ren'py, ensure that your code does not have structural issues:

```yml
- name: Run Ren'Py linter
  uses: Ayowel/renpy-setup-action@v1.2.1
  with:
    action: lint
    install_dir: renpy
    game: project
```

### Update the game's translation

After installing Ren'Py, use the `translate` action to update the game's translation files:

```yml
- uses: Ayowel/renpy-setup-action@v1.2.1
  id: renpy
  with:
    action: translate
    install_dir: renpy
    game: project
    languages: french english
```

### Get layout information

After installing Ren'Py, use the `nothing` action if you just want to get one of the action's outputs, such as the Python installation's path :

```yml
- uses: Ayowel/renpy-setup-action@v1.2.1
  id: renpy
  with:
    action: nothing
    install_dir: renpy
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
      - uses: actions/checkout@v3
        with:
          path: project
      - uses: actions/setup-java@v3
        with:
          distribution: 'adopt-hotspot'
          java-version: '8'
      - name: Create keystore
        run: base64 -d <<<"$ANDROID_KEYSTORE" >android.keystore
        env:
          ANDROID_KEYSTORE: ${{ secrets.ANDROID_KEYSTORE }}
      - uses: actions/cache@v3
        id: cache-renpy-android
        with:
          path: renpy
          key: ${{ runner.os }}-renpy
      - uses: Ayowel/renpy-setup-action@v1.2.1
        if: steps.cache-renpy-android.outputs.cache-hit != 'true'
        with:
          action: install
          install_dir: renpy
          dlc: rapt
          android_sdk: true
          android_properties: |
            key.alias=android
            key.store.password=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
            key.alias.password=${{ secrets.ANDROID_ALIAS_PASSWORD }}
            key.store=${{ github.workspace }}/android.keystore
      # The project must have a .android.json file
      - uses: Ayowel/renpy-setup-action@v1.2.1
        with:
          action: android_build
          install_dir: renpy
          build_type: apk
          game: project
          out_dir: target
```

## Inputs

This action supports the following inputs:

```yml
- uses: Ayowel/renpy-setup-action@v1.2.1
  with:
    # What the action should do. Must be one of:
    # 'install', 'distribute', 'android_build',
    # 'lint', 'exec', 'translate', and 'nothing'
    action: install
    # Directory where Ren'Py is/will be installed.
    # The directory may not exist if the action is install.
    # If the directory does not exist and the action is not
    # 'install', Ren'Py will be installed before running
    # the action.
    install_dir: ~/.renpy_exec
    # Directory of the Ren'Py game
    game: .
    # Where the Java 8 SDK is located
    java_home:

    ### INSTALL INPUTS ###
    # Comma/space-separated list of Ren'Py DLCs to install
    dlc: steam
    # Path to a live2d release to install.
    # This option is not supported yet.
    live2d: https://cubism.live2d.com/sdk-native/bin/CubismSdkForNative-4-r.5.1.zip
    # Whether Ren'Py's directory should be added to the PATH
    update_path: false
    # Ren'Py version to install. Defaults to the latest GitHub Release
    version: latest
    ## Android install inputs
    # Whether to install the Android SDK
    android_sdk: false
    # Input for the SDK installation process - this should not be used in most cases
    android_sdk_install_input:
    # If android_sdk_install_input is not provided, what company name to use when installing the SDK
    android_sdk_owner:
    # Configuration properties to use when building android releases
    # aab/apk replace the default properties if provided
    android_properties:
    android_aab_properties:
    android_apk_properties:
    ## Install data source inputs
    # Whether to download release assets from GitHub
    use_github_releases: true
    # The GitHub repository that releases assets for the desired release
    github_releases_repo: renpy/renpy
    # The GitHub token to use to query the api. Defaults to the workflow's token
    github_token: ${{ github.token }}
    # Whether to use Ren'Py's CDN
    # If use_github is true, it will be search for the desired version first
    use_cdn: true
    # The base URL of the CDN that provides Ren'Py's releases' assets
    cdn_url: https://www.renpy.org/dl

    ### DISTRIBUTE INPUTS ###
    # Comma/newline-separated list of packages that should
    # be built
    packages: all
    # Directory where generated packages should be saved
    out_dir: ""

    ### ANDROID_BUILD INPUTS
    # Whether to build an Universak APK (apk) or a Play Bundle (aab)
    build_type: apk
    # Directory where generated packages should be saved
    out_dir: ""

    ### EXEC INPUTS
    # The arguments to provide to Ren'Py
    run: --help
```

## Output

| Output name | Description |
| :---: | :--- |
| __`install_dir`__ | Path to Ren'Py's install directory |
| __`renpy_path`__ | Path to the Ren'Py executable |
| __`python_path`__ | Path to the Python executable embedded in Ren'Py |
