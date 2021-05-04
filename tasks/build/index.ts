import * as path from "path";
import * as task from "azure-pipelines-task-lib/task";

const FLUTTER_TOOL_PATH_ENV_VAR: string = 'FlutterToolPath';

async function main(): Promise<void> {
    // 1. Check flutter environment
    var flutterPath = task.getVariable(FLUTTER_TOOL_PATH_ENV_VAR) || process.env[FLUTTER_TOOL_PATH_ENV_VAR] || task.getInput('flutterDirectory', false);
    flutterPath = path.join(flutterPath, "flutter")
    if (!flutterPath) {
        throw new Error(`The '${FLUTTER_TOOL_PATH_ENV_VAR}' environment variable must be set before using this task (you can use 'flutterinstall' task).`);
    }

    // 2. Get target
    let target = task.getInput('target', true);

    // 3. Move current working directory to project
    let projectDirectory = task.getPathInput('projectDirectory', false, false);
    if (projectDirectory) {
        task.debug(`Moving to ${projectDirectory}`);
        task.cd(projectDirectory);
    }
    task.debug(`Project's directory : ${task.cwd()}`);

    // 4. Get common input
    let debugMode = task.getBoolInput('debugMode', false);
    let buildName = task.getInput('buildName', false);
    let buildNumber = task.getInput('buildNumber', false);
    let buildFlavour = task.getInput('buildFlavour', false);
    let entryPoint = task.getInput('entryPoint', false);
    let additionalArguments = task.getInput('additionalArguments', false);


    // 5. Builds
    if (target === "all" || target === "ios") {
        let targetPlatform = task.getInput('iosTargetPlatform', false);
        let codesign = task.getBoolInput('iosCodesign', false);
        await buildIpa(flutterPath, additionalArguments, targetPlatform == "simulator", codesign, buildName, buildNumber, debugMode, buildFlavour, entryPoint);
    }

    if (target === "all" || target === "apk") {
        let targetPlatform = task.getInput('apkTargetPlatform', false);
        await buildApk(flutterPath, additionalArguments, targetPlatform, buildName, buildNumber, debugMode, buildFlavour, entryPoint);
    }

    if (target === "all" || target === "aab") {
        await buildAab(flutterPath, additionalArguments, buildName, buildNumber, debugMode, buildFlavour, entryPoint);
    }

    if (target === "web") {
        await buildWeb(flutterPath, additionalArguments);
    }

    task.setResult(task.TaskResult.Succeeded, "Application built");
}

async function buildApk(flutter: string, additionalArguments: string, targetPlatform?: string, buildName?: string, buildNumber?: string, debugMode?: boolean, buildFlavour?: string, entryPoint?: string) {

    var args = [
        "build",
        "apk"
    ];

    if (debugMode) {
        args.push("--debug");
    }

    if (targetPlatform) {
        args.push("--target-platform=" + targetPlatform);
    }

    if (buildName) {
        args.push("--build-name=" + buildName);
    }

    if (buildNumber) {
        args.push("--build-number=" + buildNumber);
    }

    if (buildFlavour) {
        args.push("--flavor=" + buildFlavour);
    }

    if (entryPoint) {
        args.push("--target=" + entryPoint);
    }

    if (additionalArguments) {
        var splitted = additionalArguments.split(" ");
        args.push(...splitted)
    }

    var result = await task.exec(flutter, args);

    if (result !== 0) {
        throw new Error("apk build failed");
    }
}

async function buildAab(flutter: string, additionalArguments: string, buildName?: string, buildNumber?: string, debugMode?: boolean, buildFlavour?: string, entryPoint?: string) {

    var args = [
        "build",
        "appbundle"
    ];

    if (debugMode) {
        args.push("--debug");
    }

    if (buildName) {
        args.push("--build-name=" + buildName);
    }

    if (buildNumber) {
        args.push("--build-number=" + buildNumber);
    }

    if (buildFlavour) {
        args.push("--flavor=" + buildFlavour);
    }

    if (entryPoint) {
        args.push("--target=" + entryPoint);
    }

    if (additionalArguments) {
        var splitted = additionalArguments.split(" ");
        args.push(...splitted)
    }

    var result = await task.exec(flutter, args);

    if (result !== 0) {
        throw new Error("aab build failed");
    }
}

async function buildIpa(flutter: string, additionalArguments: string, simulator?: boolean, codesign?: boolean, buildName?: string, buildNumber?: string, debugMode?: boolean, buildFlavour?: string, entryPoint?: string) {

    var args = [
        "build",
        "ios"
    ];

    if (debugMode) {
        args.push("--debug");
    }

    if (simulator) {
        args.push("--simulator");

        if (!debugMode) {
            args.push("--debug"); // simulator can only be built in debug
        }
    }
    else if (codesign) {
        args.push("--codesign");
    }
    else {
        args.push("--no-codesign");
    }

    if (buildName) {
        args.push("--build-name=" + buildName);
    }

    if (buildNumber) {
        args.push("--build-number=" + buildNumber);
    }

    if (entryPoint) {
        args.push("--target=" + entryPoint);
    }

    if (!simulator) {
        if (buildFlavour) {
            args.push("--flavor=" + buildFlavour);
        }
    }

    if (additionalArguments) {
        var splitted = additionalArguments.split(" ");
        args.push(...splitted)
    }

    var result = await task.exec(flutter, args);
    if (result !== 0) {
        throw new Error("ios build failed");
    }
}

async function buildWeb(flutter: string, additionalArguments: string,) {

    var args = [
        "build",
        "web"
    ];

    if (additionalArguments) {
        var splitted = additionalArguments.split(" ");
        args.push(...splitted)
    }

    var result = await task.exec(flutter, args);

    if (result !== 0) {
        throw new Error("web build failed");
    }
}

main().catch(error => {
    task.setResult(task.TaskResult.Failed, error);
});
