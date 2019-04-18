# Flutter for Azure DevOps

[Flutter](http://flutter.io) build task for [Azure DevOps](https://azure.microsoft.com/fr-fr/services/devops/).

## Installation

Installation can be done using [Visual Studio MarketPlace](https://marketplace.visualstudio.com/items?itemName=aloisdeniel.flutter).

## Source Code

Source code can be found on [Github](https://github.com/aloisdeniel/vsts-flutter-tasks).

## Usage

Add the tasks to your build definition.

### Install

![](images/step_install.png)

Installs the [Flutter SDK](https://flutter.io/sdk-archive/) onto the running agent if not already installed. Then uses it for following tasks.

* Select the `channel`: `stable (default)`, `beta`, or `dev`.
* Select the `version` of the SDK to install:  `latest (default)`, `custom`. If `custom` is specified, a `custom version` must be set.
* _(Optional)_. Set the `custom version` (in a `<M>.<m>.<p>` semver format) if needed.

### Build

![](images/step_build.png)

Build the given mobile application project. You must call the `Flutter Install` task, set a `FlutterToolPath` environment variable, or use the optional Flutter SDK Path task entry that points to your `flutter/bin` folder before execution. All the application bundles are created into the `build/outputs` folder of your project.

* Select the `project source directory` (that contains to `pubspec.yaml` file).
* Select the `target` platform: `Android (default)`, `iOS`, or `All` for both.
* _(Optional)_. Set `flutter sdk path` if using a local agent with a pre-installed Flutter SDK, can specify the path to utilize it.  Otherwise use Flutter Install.
* _(Optional)_. Set `package name` (like `1.2.3`) that will override the manifest's one.
* _(Optional)_. Set `package number` (like `12`) that will override the manifest's one.
* _(Optional)_. Set `build flavour` (like `development`) to specify a build flavour.  Must match Android Gradle flavor definition or XCode scheme.
* _(Optional)_. Set `debug` if you wish to override the default release mode for the build.
* __(Android)__._(Optional)_. Set `platform` for the Android target: `android-arm (default)`, `android-arm64`.
* __(iOS)__._(Optional)_. Set `platform` for the iOS target: `device (default)`, `simulator`.
* __(iOS)__._(Optional)_. Codesign the application bundle (only available on device builds, and activated by default). **Warning: you must install a valid certificate before build with the `Install an Apple Certificate`task**

### Test

![](images/step_test.png)

Launch tests and publish a report as build test results.

* Select the `project source directory` (that contains to `pubspec.yaml` file).
* _(Optional)_. Set `test name` as a regular expression matching substrings of the names of tests to run.
* _(Optional)_. Set `Test plain name` as a plain-text substring of the names of tests to run.
* _(Optional)_. Set `Test plain name` as a plain-text substring of the names of tests to run.
* _(Optional)_. Set `update goldens`: whether `matchesGoldenFile()` calls within your test methods should update the golden files rather than test for an existing match.
* _(Optional)_. The number of `concurrent` test processes to run. (defaults to `6`)


## License

[MIT](https://raw.githubusercontent.com/aloisdeniel/vsts-flutter-tasks/master/LICENSE)