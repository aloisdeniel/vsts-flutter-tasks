import * as path from "path";
import * as task from "vsts-task-lib/task";

const FLUTTER_TOOL_PATH_ENV_VAR: string = 'FlutterToolPath';

async function main(): Promise<void> {
    // 1. Check flutter environment
    var flutterPath = task.getVariable(FLUTTER_TOOL_PATH_ENV_VAR) || process.env[FLUTTER_TOOL_PATH_ENV_VAR];
    flutterPath = path.join(flutterPath, "flutter")
    if (!flutterPath) {
        throw new Error(`The '${FLUTTER_TOOL_PATH_ENV_VAR}' environment variable must be set before using this task (you can use 'flutterinstall' task).`);
    }

    // 2. Clean if requested
    task.debug(`Cleaning`);
    clean(flutterPath);

    // 3. Get target
    let target = task.getInput('target', true);

    // 4. Move current working directory to project
    let projectDirectory = task.getPathInput('projectDirectory', false, false);
    if (projectDirectory) {
        task.debug(`Moving to ${projectDirectory}`);
        task.cd(projectDirectory);
    }

    // 5. Get common input
    let buildName = task.getInput('buildName', false);
    let buildNumber = task.getInput('buildNumber', false);

    // 6. Builds
    if (target === "all" || target === "ios") {
        let targetPlatform = task.getInput('iosTargetPlatform', false);
        let codesign = task.getBoolInput('iosCodesign', false);
        buildIpa(flutterPath, targetPlatform == "simulator", codesign, buildName, buildNumber);
    }

    if (target === "all" || target === "apk") {
        let targetPlatform = task.getInput('apkTargetPlatform', false);
        buildApk(flutterPath, targetPlatform, buildName, buildNumber);
    }

    task.setResult(task.TaskResult.Succeeded, "Application built");
}

function clean(flutter: string) {
    return task.exec(flutter, ["clean"]);
}

function buildApk(flutter: string, targetPlatform?: string, buildName?: string, buildNumber?: string) {

    var args = [
        "build",
        "apk",
        "--pub",
        "--release"
    ];

    if (targetPlatform) {
        args.push("--target-platform=" + targetPlatform);
    }

    if (buildName) {
        args.push("--build-name=" + buildName);
    }

    if (buildNumber) {
        args.push("--build-number=" + buildNumber);
    }

    if (task.exec(flutter, args) !== 0) {
        throw new Error("apk build failed");
    }
}

function buildIpa(flutter: string, simulator?: boolean, codesign?: boolean, buildName?: string, buildNumber?: string) {

    var args = [
        "build",
        "ios",
        "--pub",
        "--release"
    ];

    if (simulator) {
        args.push("--simulator");
    }
    else if (codesign) {
        args.push("--codesign");
    }

    if (buildName) {
        args.push("--build-name=" + buildName);
    }

    if (buildNumber) {
        args.push("--build-number=" + buildNumber);
    }

    if (task.exec(flutter, args) !== 0) {
        throw new Error("ios build failed");
    }
}

main().catch(error => {
    task.setResult(task.TaskResult.Failed, error);
});