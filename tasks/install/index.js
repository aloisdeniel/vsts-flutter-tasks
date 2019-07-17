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
const os = require("os");
const request = require("request-promise");
const task = require("vsts-task-lib/task");
const tool = require("vsts-task-tool-lib/tool");
const FLUTTER_TOOL_NAME = 'Flutter';
const FLUTTER_EXE_RELATIVEPATH = 'flutter/bin';
const FLUTTER_TOOL_PATH_ENV_VAR = 'FlutterToolPath';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Getting current platform identifier
        let arch = findArchitecture();
        const releaseData = getReleaseData(arch);
        const _baseUrl = releaseData['base_url'];
        let urlRelative = '';
        // 2. Building version spec
        let channel = task.getInput('channel', true);
        let version = task.getInput('version', true);
        let semVer = task.getInput('customVersion', false);
        let versionSpec = `${semVer}-${channel}`;
        if (version === 'latest' || semVer === "")
            urlRelative = yield findLatestUrl(releaseData, channel);
        else
            urlRelative = yield findVersionUrl(releaseData, channel, semVer);
        // 3. Check if already available
        task.debug(`Trying to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`);
        let toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);
        if (!toolPath) {
            // 4.1. Downloading SDK
            yield downloadAndCacheSdk(`${_baseUrl}/${urlRelative}`, versionSpec, channel, arch);
            // 4.2. Verifying that tool is now available
            task.debug(`Trying again to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`);
            toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);
        }
        // 5. Creating the environment variable
        let fullFlutterPath = path.join(toolPath, FLUTTER_EXE_RELATIVEPATH);
        task.debug(`Set ${FLUTTER_TOOL_PATH_ENV_VAR} with '${fullFlutterPath}'`);
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
function downloadAndCacheSdk(downloadUrl, versionSpec, channel, arch) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Download SDK archive
        task.debug(`Starting download archive from '${downloadUrl}'`);
        var bundleZip = yield tool.downloadTool(downloadUrl);
        task.debug(`Succeeded to download '${bundleZip}' archive from '${downloadUrl}'`);
        // 2. Extracting SDK bundle
        task.debug(`Extracting '${downloadUrl}' archive`);
        var bundleDir = yield tool.extractZip(bundleZip);
        task.debug(`Extracted to '${bundleDir}' '${downloadUrl}' archive`);
        // 3. Adding SDK bundle to cache
        task.debug(`Adding '${bundleDir}' to cache (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch})`);
        tool.cacheDir(bundleDir, FLUTTER_TOOL_NAME, versionSpec, arch);
    });
}
function getReleaseData(arch) {
    return __awaiter(this, void 0, void 0, function* () {
        var releasesUrl = `https://storage.googleapis.com/flutter_infra/releases/releases_${arch}.json`;
        task.debug(`Finding latest version from '${releasesUrl}'`);
        return JSON.parse((yield request.get(releasesUrl)));
    });
}
function findLatestUrl(releaseData, channel) {
    var currentHash = releaseData.current_release[channel];
    task.debug(`Last version hash '${currentHash}'`);
    var current = releaseData.releases.find((item) => item.hash === currentHash);
    return current.archive;
}
function findVersionUrl(releaseData, channel, version) {
    task.debug(`Requested channel and version '${channel} ${version}'`);
    var release = releaseData.releases.find((item) => item.version === version && item.channel === channel);
    if (!release)
        task.debug(`The requested version of specified channel was not found`);
    return release.archive;
}
main().catch(error => {
    task.setResult(task.TaskResult.Failed, error);
});
