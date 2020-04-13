import * as path from 'path';
import * as os from 'os';
import * as request from 'request-promise';
import * as task from "azure-pipelines-task-lib/task";
import * as tool from 'azure-pipelines-tool-lib/tool';

const FLUTTER_TOOL_NAME: string = 'Flutter';
const FLUTTER_EXE_RELATIVEPATH = 'flutter/bin';
const FLUTTER_TOOL_PATH_ENV_VAR: string = 'FlutterToolPath';

type StorageHostType = 'original' | 'china';
let storageHostType: StorageHostType = 'china';
let storageHosts: { [key: string]: string } = {
	'original': 'storage.googleapis.com',
	'china': 'storage.flutter-io.cn', // https://flutter.dev/community/china
};

async function main(): Promise<void> {
	// 1. Getting current platform identifier
	let arch = findArchitecture();

	// 2. Building version spec
	let channel = task.getInput('channel', true);
	let version = task.getInput('version', true);
	let semVer = task.getInput('customVersion', false);
	if (version === 'latest' || semVer === "")
		semVer = await findLatestSdkVersion(channel, arch);
	let versionSpec = `${semVer}-${channel}`;
	const storageHostParam = task.getInput('storageHost', false) as StorageHostType;
	console.log(`storageHostParam: ${storageHostParam}`);
	if (storageHostParam === 'china') {
		storageHostType = storageHostParam;
	}

	// 3. Check if already available
	console.log(`Trying to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`);
	let toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);

	if (!toolPath) {
		// 4.1. Downloading SDK
		await downloadAndCacheSdk(versionSpec, channel, arch);

		// 4.2. Verifying that tool is now available
		console.log(`Trying again to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`);
		toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);
	}

	// 5. Creating the environment variable
	let fullFlutterPath: string = path.join(toolPath, FLUTTER_EXE_RELATIVEPATH);
	console.log(`Set ${FLUTTER_TOOL_PATH_ENV_VAR} with '${fullFlutterPath}'`);
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

async function downloadAndCacheSdk(versionSpec: string, channel: string, arch: string): Promise<void> {
	// 1. Download SDK archive
	let downloadUrl = `https://${storageHosts[storageHostType]}/flutter_infra/releases/${channel}/${arch}/flutter_${arch}_${versionSpec}.zip`;
	console.log(`Starting download archive from '${downloadUrl}'`);
	var bundleZip = await tool.downloadTool(downloadUrl);
	console.log(`Succeeded to download '${bundleZip}' archive from '${downloadUrl}'`);

	// 2. Extracting SDK bundle
	console.log(`Extracting '${downloadUrl}' archive`);
	var bundleDir = await tool.extractZip(bundleZip);
	console.log(`Extracted to '${bundleDir}' '${downloadUrl}' archive`);

	// 3. Adding SDK bundle to cache
	console.log(`Adding '${bundleDir}' to cache (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch})`);
	tool.cacheDir(bundleDir, FLUTTER_TOOL_NAME, versionSpec, arch);
}

async function findLatestSdkVersion(channel: string, arch: string): Promise<string> {
	var releasesUrl = `https://${storageHosts[storageHostType]}/flutter_infra/releases/releases_${arch}.json`;
	console.log(`Finding latest version from '${releasesUrl}'`);
	var body = await request.get(releasesUrl);
	var json = JSON.parse(body);
	var currentHash = json.current_release[channel];
	console.log(`Last version hash '${currentHash}'`);
	var current = json.releases.find((item) => item.hash === currentHash);
	return current.version;
}

main().catch(error => {
	task.setResult(task.TaskResult.Failed, error);
});
