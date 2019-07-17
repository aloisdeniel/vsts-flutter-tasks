import * as path from 'path';
import * as os from 'os';
import * as request from 'request-promise';
import * as task from "vsts-task-lib/task";
import * as tool from 'vsts-task-tool-lib/tool';

const FLUTTER_TOOL_NAME: string = 'Flutter';
const FLUTTER_EXE_RELATIVEPATH = 'flutter/bin';
const FLUTTER_TOOL_PATH_ENV_VAR: string = 'FlutterToolPath';

async function main(): Promise<void> {
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
		urlRelative = await findLatestUrl(releaseData, channel);
	else
		urlRelative = await findVersionUrl(releaseData, channel, semVer);

	// 3. Check if already available
	task.debug(`Trying to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`);
	let toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);

	if (!toolPath) {
		// 4.1. Downloading SDK
		await downloadAndCacheSdk(`${_baseUrl}/${urlRelative}`, versionSpec, channel, arch);

		// 4.2. Verifying that tool is now available
		task.debug(`Trying again to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`);
		toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);
	}

	// 5. Creating the environment variable
	let fullFlutterPath: string = path.join(toolPath, FLUTTER_EXE_RELATIVEPATH);
	task.debug(`Set ${FLUTTER_TOOL_PATH_ENV_VAR} with '${fullFlutterPath}'`);
	task.setVariable(FLUTTER_TOOL_PATH_ENV_VAR, fullFlutterPath);
	task.setResult(task.TaskResult.Succeeded, "Installed");
}

function findArchitecture() {
	if (os.platform() === 'darwin')
		return "macos";
	else if (os.platform() === 'linux')
		return "linux";
	return "windows";
}

async function downloadAndCacheSdk(downloadUrl: string, versionSpec: string, channel: string, arch: string): Promise<void> {
	// 1. Download SDK archive
	task.debug(`Starting download archive from '${downloadUrl}'`);
	var bundleZip = await tool.downloadTool(downloadUrl);
	task.debug(`Succeeded to download '${bundleZip}' archive from '${downloadUrl}'`);

	// 2. Extracting SDK bundle
	task.debug(`Extracting '${downloadUrl}' archive`);
	var bundleDir = await tool.extractZip(bundleZip);
	task.debug(`Extracted to '${bundleDir}' '${downloadUrl}' archive`);

	// 3. Adding SDK bundle to cache
	task.debug(`Adding '${bundleDir}' to cache (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch})`);
	tool.cacheDir(bundleDir, FLUTTER_TOOL_NAME, versionSpec, arch);
}

async function getReleaseData(arch: string): Promise<any> {
	var releasesUrl = `https://storage.googleapis.com/flutter_infra/releases/releases_${arch}.json`;
	task.debug(`Finding latest version from '${releasesUrl}'`);
	return JSON.parse((await request.get(releasesUrl)));
}

function findLatestUrl(releaseData: any, channel: string): string {
	var currentHash = releaseData.current_release[channel];
	task.debug(`Last version hash '${currentHash}'`);
	var current = releaseData.releases.find((item) => item.hash === currentHash);
	return current.archive;
}

function findVersionUrl(releaseData: any, channel: string, version: string): string {
	task.debug(`Requested channel and version '${channel} ${version}'`);
	var release = releaseData.releases.find((item) => item.version === version && item.channel === channel);

	if (!release)
		task.debug(`The requested version of specified channel was not found`);

	return release.archive;
}

main().catch(error => {
	task.setResult(task.TaskResult.Failed, error);
});