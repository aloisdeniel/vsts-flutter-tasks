"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const task = require("azure-pipelines-task-lib/task");
const FLUTTER_TOOL_PATH_ENV_VAR = 'FlutterToolPath';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Check flutter environment
        var flutterPath = task.getVariable(FLUTTER_TOOL_PATH_ENV_VAR) || process.env[FLUTTER_TOOL_PATH_ENV_VAR] || task.getInput('flutterDirectory', false);
        flutterPath = path.join(flutterPath, "flutter");
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
        // 5. Builds
        if (target === "all" || target === "ios") {
            let targetPlatform = task.getInput('iosTargetPlatform', false);
            let codesign = task.getBoolInput('iosCodesign', false);
            yield buildIpa(flutterPath, targetPlatform == "simulator", codesign, buildName, buildNumber, debugMode, buildFlavour);
        }
        if (target === "all" || target === "apk") {
            let targetPlatform = task.getInput('apkTargetPlatform', false);
            yield buildApk(flutterPath, targetPlatform, buildName, buildNumber, debugMode, buildFlavour);
        }
        task.setResult(task.TaskResult.Succeeded, "Application built");
    });
}
function buildApk(flutter, targetPlatform, buildName, buildNumber, debugMode, buildFlavour) {
    return __awaiter(this, void 0, void 0, function* () {
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
        var result = yield task.exec(flutter, args);
        if (result !== 0) {
            throw new Error("apk build failed");
        }
    });
}
function buildIpa(flutter, simulator, codesign, buildName, buildNumber, debugMode, buildFlavour) {
    return __awaiter(this, void 0, void 0, function* () {
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
        if (buildName) {
            args.push("--build-name=" + buildName);
        }
        if (buildNumber) {
            args.push("--build-number=" + buildNumber);
        }
        if (!simulator) {
            if (buildFlavour) {
                args.push("--flavor=" + buildFlavour);
            }
        }
        var result = yield task.exec(flutter, args);
        if (result !== 0) {
            throw new Error("ios build failed");
        }
    });
}
main().catch(error => {
    task.setResult(task.TaskResult.Failed, error);
});
