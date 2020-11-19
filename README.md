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

* Select the `channel`: `stable` (default), `beta`, or `dev`.
* Select the `version` of the SDK to install:  `latest` (default), `custom`. If `custom` is specified, a `customVersion` must be set.
* _(Optional)_. Set the `customVersion` (in a `<M>.<m>.<p>` semver format) if needed.

### Build

![](images/step_build.png)

Build the given mobile application project. You must call the `Flutter Install` task or use the optional `flutterDirectory` task input that points to your `flutter/bin` folder before execution. All application bundles are created in the `build/outputs` folder of your project.

* Select the `projectDirectory` that contains the `pubspec.yaml` file.
* Select the `target` platform. Options are: `apk` (default), `aab`, `ios`, `web` or `all` for both Android and iOS, but without Web.
* _(Optional)_. Set `flutterDirectory` to set path to the Flutter SDK if you were not using `Flutter Install` task before this one
* _(Optional)_. Set `buildName` (like `1.2.3`) that will override the manifest's one.
* _(Optional)_. Set `buildNumber` (like `12`) that will override the manifest's one.
* _(Optional)_. Set `buildFlavour` (like `development`) to specify a build flavour. Must match Android Gradle flavor definition or XCode scheme.
* _(Optional)_. Set `debugMode` if you wish to override the default release mode for the build.
* _(Optional)_. Set `entryPoint` to override the main entry point file of the application. Default is 'lib/main.dart'.
* __(Android)__._(Optional)_. Set `apkTargetPlatform` for the Android platform architecture target: `android-arm` (default), `android-arm64`.
* __(iOS)__._(Optional)_. Set `iosTargetPlatform` for the iOS target: `device` (default), `simulator`.
* __(iOS)__._(Optional)_. Set `iosCodesign` to configure whenever the bundle odesign the application bundle (only available on device builds, and activated by default). **Warning: you must install a valid certificate before build with the `Install an Apple Certificate`task**

### Test

![](images/step_test.png)

Launch tests and publish a report as build test results.

* Select the `projectDirectory` that contains to `pubspec.yaml` file.
* _(Optional)_. Set `testName` as a regular expression matching substrings of the names of tests to run.
* _(Optional)_. Set `testPlainName` as a plain-text substring of the names of tests to run.
* _(Optional)_. Set `updateGoldens`: whether `matchesGoldenFile()` calls within your test methods should update the golden files rather than test for an existing match.
* _(Optional)_. Set `concurrency` to specify the number of concurrent test processes to run. Default is `6`.

### command

Launch a Flutter command with custom arguments.

## FAQ


> Flutter command isn't recognized ?

Make sure that you have a `Flutter Install` at the beginning of your definition.

> Can I run a custom Flutter command ?

Yes, right after the `Flutter Install` task, a `FlutterToolPath` environment variable points to the `bin` of the Flutter SDK directory. You just have to use `$(FlutterToolPath)` in your following tasks.

> Can I run Dart program ?

Yes, actually a Dart runtime is embedded with Flutter tools (in the `/cache/dart-sdk/bin` subdirectory). 

A task example :

```yaml
- task: CmdLine@2
  displayName: 'Execute Dart program'
  inputs:
    script: '$(FlutterToolPath)/cache/dart-sdk/bin/dart program.dart arg1 arg2'
    workingDirectory: 'src'
```

## License

[MIT](https://raw.githubusercontent.com/aloisdeniel/vsts-flutter-tasks/master/LICENSE)
