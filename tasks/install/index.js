"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const os = require("os");
const request = require("request-promise");
const task = require("azure-pipelines-task-lib/task");
const tool = require("azure-pipelines-tool-lib/tool");
const FLUTTER_TOOL_NAME = 'Flutter';
const FLUTTER_EXE_RELATIVEPATH = 'flutter/bin';
const FLUTTER_TOOL_PATH_ENV_VAR = 'FlutterToolPath';
let storageHostType = 'china';
let storageHosts = {
    'original': 'storage.googleapis.com',
    'china': 'storage.flutter-io.cn',
};
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Getting current platform identifier
        let arch = findArchitecture();
        // 2. Building version spec
        let channel = task.getInput('channel', true);
        let version = task.getInput('version', true);
        let semVer = task.getInput('customVersion', false);
        if (version === 'latest' || semVer === "")
            semVer = yield findLatestSdkVersion(channel, arch);
        let versionSpec = `${semVer}-${channel}`;
        const storageHostParam = task.getInput('storageHost', false);
        console.log(`storageHostParam: ${storageHostParam}`);
        if (storageHostParam === 'china') {
            storageHostType = storageHostParam;
        }
        // 3. Check if already available
        console.log(`Trying to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`);
        let toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);
        if (!toolPath) {
            // 4.1. Downloading SDK
            yield downloadAndCacheSdk(versionSpec, channel, arch);
            // 4.2. Verifying that tool is now available
            console.log(`Trying again to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`);
            toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);
        }
        // 5. Creating the environment variable
        let fullFlutterPath = path.join(toolPath, FLUTTER_EXE_RELATIVEPATH);
        console.log(`Set ${FLUTTER_TOOL_PATH_ENV_VAR} with '${fullFlutterPath}'`);
        task.setVariable(FLUTTER_TOOL_PATH_ENV_VAR, fullFlutterPath);
        task.setResult(task.TaskResult.Succeeded, "Installed");
    });
}
function findArchitecture() {
    if (os.platform() === 'darwin')
        return "macos";
    else if (os.platform() === 'linux')
        return "linux";
    return "windows";
}
function downloadAndCacheSdk(versionSpec, channel, arch) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Download SDK archive
        let downloadUrl = `https://${storageHosts[storageHostType]}/flutter_infra/releases/${channel}/${arch}/flutter_${arch}_${versionSpec}.zip`;
        console.log(`Starting download archive from '${downloadUrl}'`);
        var bundleZip = yield tool.downloadTool(downloadUrl);
        console.log(`Succeeded to download '${bundleZip}' archive from '${downloadUrl}'`);
        // 2. Extracting SDK bundle
        console.log(`Extracting '${downloadUrl}' archive`);
        var bundleDir = yield tool.extractZip(bundleZip);
        console.log(`Extracted to '${bundleDir}' '${downloadUrl}' archive`);
        // 3. Adding SDK bundle to cache
        console.log(`Adding '${bundleDir}' to cache (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch})`);
        tool.cacheDir(bundleDir, FLUTTER_TOOL_NAME, versionSpec, arch);
    });
}
function findLatestSdkVersion(channel, arch) {
    return __awaiter(this, void 0, void 0, function* () {
        var releasesUrl = `https://${storageHosts[storageHostType]}/flutter_infra/releases/releases_${arch}.json`;
        console.log(`Finding latest version from '${releasesUrl}'`);
        var body = yield request.get(releasesUrl);
        var json = JSON.parse(body);
        var currentHash = json.current_release[channel];
        console.log(`Last version hash '${currentHash}'`);
        var current = json.releases.find((item) => item.hash === currentHash);
        return current.version;
    });
}
main().catch(error => {
    task.setResult(task.TaskResult.Failed, error);
});
