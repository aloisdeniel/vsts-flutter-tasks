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
const https = require("https");
const task = require("azure-pipelines-task-lib");
const tool = require("azure-pipelines-tool-lib/tool");
const FLUTTER_TOOL_NAME = 'Flutter';
const FLUTTER_EXE_RELATIVEPATH = 'flutter/bin';
const FLUTTER_TOOL_PATH_ENV_VAR = 'FlutterToolPath';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Getting current platform identifier
        let arch = findArchitecture();
        // 2. Building version spec
        let channel = task.getInput('channel', true);
        var version = task.getInput('version', true);
        if (version === 'custom') {
            version = task.getInput('customVersion', true);
        }
        let sdkInfo = yield findSdkInformation(channel, arch, version);
        // 3. Check if already available
        task.debug(`Trying to get (${FLUTTER_TOOL_NAME},${sdkInfo.version}, ${arch}) tool from local cache`);
        let toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, sdkInfo.version, arch);
        if (!toolPath) {
            // 4.1. Downloading SDK
            yield downloadAndCacheSdk(sdkInfo, channel, arch);
            // 4.2. Verifying that tool is now available
            task.debug(`Trying again to get (${FLUTTER_TOOL_NAME},${sdkInfo.version}, ${arch}) tool from local cache`);
            toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, sdkInfo.version, arch);
        }
        if (toolPath) {
            // 5. Creating the environment variable
            let fullFlutterPath = path.join(toolPath, FLUTTER_EXE_RELATIVEPATH);
            task.debug(`Set ${FLUTTER_TOOL_PATH_ENV_VAR} with '${fullFlutterPath}'`);
            task.setVariable(FLUTTER_TOOL_PATH_ENV_VAR, fullFlutterPath);
            task.setResult(task.TaskResult.Succeeded, "Installed");
        }
        else {
            task.setResult(task.TaskResult.Failed, "Download succedeeded but ToolPath not found.");
        }
    });
}
/// Finds current running architecture : macos, linux or windows.
function findArchitecture() {
    if (os.platform() === 'darwin')
        return "macos";
    else if (os.platform() === 'linux')
        return "linux";
    return "windows";
}
function findSdkInformation(channel, arch, version) {
    return __awaiter(this, void 0, void 0, function* () {
        let json = yield getJSON('storage.googleapis.com', `/flutter_infra/releases/releases_${arch}.json`);
        var current = null;
        if (version === 'latest') {
            let currentHash = json.current_release[channel];
            current = json.releases.find((item) => item.hash === currentHash);
        }
        else {
            current = json.releases.find((item) => uniformizeVersion(item.version) === uniformizeVersion(version));
        }
        current.version = uniformizeVersion(current.version);
        return {
            version: current.version + '-' + channel,
            downloadUrl: json.base_url + '/' + current.archive,
        };
    });
}
function downloadAndCacheSdk(sdkInfo, channel, arch) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Download SDK archive
        task.debug(`Starting download archive from '${sdkInfo.downloadUrl}'`);
        var bundleZip = yield tool.downloadTool(sdkInfo.downloadUrl);
        task.debug(`Succeeded to download '${bundleZip}' archive from '${sdkInfo.downloadUrl}'`);
        // 2. Extracting SDK bundle
        task.debug(`Extracting '${sdkInfo.downloadUrl}' archive`);
        var bundleDir = yield tool.extractZip(bundleZip);
        task.debug(`Extracted to '${bundleDir}' '${sdkInfo.downloadUrl}' archive`);
        // 3. Adding SDK bundle to cache
        task.debug(`Adding '${bundleDir}' to cache (${FLUTTER_TOOL_NAME},${sdkInfo.version}, ${arch})`);
        tool.cacheDir(bundleDir, FLUTTER_TOOL_NAME, sdkInfo.version, arch);
    });
}
main().catch(error => {
    task.setResult(task.TaskResult.Failed, error);
});
/// Removes the 'v' prefix from given version.
function uniformizeVersion(version) {
    if (version.startsWith('v')) {
        return version.substring(1);
    }
    return version;
}
/// Sends an https request and parses the result as JSON.
function getJSON(hostname, path) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let options = {
                hostname: hostname,
                port: 443,
                path: path,
                method: 'GET',
            };
            const req = https.request(options, res => {
                let data = '';
                // A chunk of data has been recieved.
                res.on('data', (chunk) => {
                    data += chunk;
                });
                // The whole response has been received. Print out the result.
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', error => {
                reject(error);
            });
            req.end();
        });
    });
}
