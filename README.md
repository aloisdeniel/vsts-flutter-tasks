# Flutter for Azure DevOps

[Flutter](http://flutter.io) build task for [Azure DevOps](https://azure.microsoft.com/fr-fr/services/devops/).

## Installation

Installation can be done using [Visual Studio MarketPlace](https://marketplace.visualstudio.com/items?itemName=aloisdeniel.vsts-flutter).

## Source Code

Source code can be found on [Github](https://github.com/aloisdeniel/vsts-flutter-tasks).

## Usage

Add the tasks to your build definition.

### Install

Installs the [Flutter SDK](https://flutter.io/sdk-archive/) onto the running agent if not already installed. Then uses it for following tasks.

* Select the [Flutter SDK release `channel`](https://flutter.io/sdk-archive/) : `beta (default)`, `dev`.
* Select the `version` of the SDK to install :  `latest (default)`, `custom`. If `custom` is precised, a `custom version` must be set.
* _(Optional)_. Set the `custom version` (in a `<M>.<m>.<p>` semver format) if needed.

### Build

Build the given mobile application project. You must call the `Flutter Install` task before, or set a `FlutterToolPath` environment that points to your `flutter/bin` folder before execution. All the application bundles are created into the `build/outputs` folder of your project.

* Select the `project source directory` (that contains to `pubspec.yaml` file).
* Select the `target` platform : `Android (default)`, `iOS`.
* _(Optional)_. Set `package name` (like `com.fabrikam.stocks`) that will override the manifest's one.
* _(Optional)_. Set `package number` (like `12`) that will override the manifest's one.
* __(Android)__._(Optional)_. Set `platform` for the Android target : `android-arm (default)`, `android-arm64`.
* __(iOS)__._(Optional)_. Set `platform` for the iOS target : `device (default)`, `simulator`.
* __(iOS)__._(Optional)_. Codesign the application bundle (only available on device builds, and activated by default).

## License

[MIT](https://raw.githubusercontent.com/aloisdeniel/vsts-flutter-tasks/master/LICENSE)