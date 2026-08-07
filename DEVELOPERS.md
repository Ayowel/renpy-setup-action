# Development instructions

## Required dependencies

For simple code changes:

* [Git](https://git-scm.com/)
* [NodeJS](https://nodejs.org/en)

For android tests:

* [OpenJDK 8](https://adoptium.net/temurin/releases/?version=8) (with the `JAVA_HOME8` environment variable)
* [OpenJDK 21](https://adoptium.net/temurin/releases/?version=21) (with the `JAVA_HOME21` environment variable)

For reproducible and stable local development:

* [Docker](https://www.docker.com/) or [Podman](https://podman.io/) to build `dev.Dockerfile` (the image may then be used for development as it contains all of the required runtime tools)
* [Act](https://github.com/nektos/act) with Docker or Podman

## Build the project

* Clone the project locally then move into the cloned directory:

```bash
git clone https://github.com/Ayowel/renpy-setup-action.git
cd renpy-setup-action
```

* Install all node dependencies:

```bash
npm ci
```

* Build the single-file executable:

```bash
npm run build
```

A new runnable `index.js` file will then be generated in `dist/setup`.

*Note that this file is not used during development, it is just an artefact used when the action runs in GitHub.*

## Run tests

After installing all project dependencies, run the tests with:

```bash
npm run test
```

Notes on tests:

* Some tests use Github's API and may quickly reach the unauthenticated API usage limit. Set the `GITHUB_TOKEN` environment variable to use your own token and circumvent this limitation. The token does not need any specific permission.
* Android tests use the host's Java installation. Set the `JAVA_HOME8` and `JAVA_HOME21` environment variables to the corresponding Java JDK installations or unset them to skip all android-related tests.

## Contribute

Thank you for your interest in the project. If you have something you want to contribute:

* Make sure that all tests are passing
* Run the code formatter (`npm run format`) before committing
* Commit messages short form part must honor the format `TYPE(WHAT): MSG` with:
    * `TYPE` one of `fix`, `feat`, or `chore`
    * `WHAT` a keyword for what this changeset targets (e.g.: when changing the GitHub adapter in `src/adapter/github.ts`, use `github` or `adapter`)
    * `MSG` a short message that describes the change
* Explain why you had to change something and what you did in your Pull Request
