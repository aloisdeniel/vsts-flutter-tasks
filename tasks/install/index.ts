import * as path from "path";
import * as os from "os";
import * as https from "https";
import * as task from "azure-pipelines-task-lib";
import * as tool from "azure-pipelines-tool-lib/tool";

const FLUTTER_TOOL_NAME: string = "Flutter";
const FLUTTER_EXE_RELATIVEPATH = "flutter/bin";
const FLUTTER_TOOL_PATH_ENV_VAR: string = "FlutterToolPath";

async function main(): Promise<void> {
  // 1. Getting current platform identifier
  let arch = findArchitecture();

  // 2. Building version spec
  let channel = task.getInput("channel", true);
  var version = task.getInput("version", true);
  let customVersion = task.getInput("customVersion", true);
  task.debug(
    `Following input was provided. arch=${arch}, channel=${channel}, version=${version}, customVersion=${customVersion}.`
  );

  validateInput(channel, version, customVersion);

  if (version === "custom") {
    version = customVersion;
  }

  let sdkInfo = await findSdkInformation(channel, arch, version);

  // 3. Check if already available
  task.debug(
    `Trying to get (${FLUTTER_TOOL_NAME},${sdkInfo.version}, ${arch}) tool from local cache`
  );
  let toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, sdkInfo.version, arch);

  if (!toolPath) {
    // 4.1. Downloading SDK
    await downloadAndCacheSdk(sdkInfo, channel, arch);

    // 4.2. Verifying that tool is now available
    task.debug(
      `Trying again to get (${FLUTTER_TOOL_NAME},${sdkInfo.version}, ${arch}) tool from local cache`
    );
    toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, sdkInfo.version, arch);
  }

  if (toolPath) {
    // 5. Creating the environment variable
    let fullFlutterPath: string = path.join(toolPath, FLUTTER_EXE_RELATIVEPATH);
    task.debug(`Set ${FLUTTER_TOOL_PATH_ENV_VAR} with '${fullFlutterPath}'`);
    task.setVariable(FLUTTER_TOOL_PATH_ENV_VAR, fullFlutterPath);
    task.setResult(task.TaskResult.Succeeded, "Installed");
  } else {
    task.setResult(
      task.TaskResult.Failed,
      "Download succedeeded but ToolPath not found."
    );
  }
}

/// Finds current running architecture : macos, linux or windows.
function findArchitecture() {
  if (os.platform() === "darwin") return "macos";
  else if (os.platform() === "linux") return "linux";
  return "windows";
}

// validates the given input
function validateInput(channel, version, customVersion) {
  if (["stable", "beta", "dev"].indexOf(channel) < 0) {
    throw "wrong channel given. Please provide a correct value. Possible values: 'stable', 'beta', 'dev'";
  }

  if (["latest", "custom"].indexOf(channel) < 0) {
    throw "wrong version given. Please provide a correct value. Possible values: 'latest', 'custom'";
  }

  if (version === "custom" && typeof customVersion === "undefined") {
    throw "version 'custom' was given. Please provide a customVersion property.";
  }
}

async function findSdkInformation(
  channel: string,
  arch: string,
  version: string
): Promise<{ downloadUrl: string; version: string }> {
  let json = await getJSON(
    "storage.googleapis.com",
    `/flutter_infra/releases/releases_${arch}.json`
  );
  var current = null;

  if (version === "latest") {
    let currentHash = json.current_release[channel];
    current = json.releases.find(
      (item: { hash: any }) => item.hash === currentHash
    );
  } else {
    current = json.releases.find(
      (item: { version: any }) =>
        uniformizeVersion(item.version) === uniformizeVersion(version)
    );
  }

  if (!current) {
    throw Error(`No version ${version} found in release history.`);
  }

  current.version = uniformizeVersion(current.version);

  return {
    version: current.version + "-" + channel,
    downloadUrl: json.base_url + "/" + current.archive,
  };
}

async function downloadAndCacheSdk(
  sdkInfo: { downloadUrl: string; version: string },
  channel: string,
  arch: string
): Promise<void> {
  // 1. Download SDK archive
  task.debug(`Starting download archive from '${sdkInfo.downloadUrl}'`);
  var bundleZip = await tool.downloadTool(sdkInfo.downloadUrl);
  task.debug(
    `Succeeded to download '${bundleZip}' archive from '${sdkInfo.downloadUrl}'`
  );

  // 2. Extracting SDK bundle
  task.debug(`Extracting '${sdkInfo.downloadUrl}' archive`);
  var bundleDir = await tool.extractZip(bundleZip);
  task.debug(`Extracted to '${bundleDir}' '${sdkInfo.downloadUrl}' archive`);

  // 3. Adding SDK bundle to cache
  task.debug(
    `Adding '${bundleDir}' to cache (${FLUTTER_TOOL_NAME},${sdkInfo.version}, ${arch})`
  );
  tool.cacheDir(bundleDir, FLUTTER_TOOL_NAME, sdkInfo.version, arch);
}

main().catch((error) => {
  task.setResult(task.TaskResult.Failed, error);
});

/// Removes the 'v' prefix from given version.
function uniformizeVersion(version: string): string {
  if (version.startsWith("v")) {
    return version.substring(1);
  }
  return version;
}

/// Sends an https request and parses the result as JSON.
async function getJSON(hostname: string, path: string): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    let options: https.RequestOptions = {
      hostname: hostname,
      port: 443,
      path: path,
      method: "GET",
    };

    const req = https.request(options, (res) => {
      let data = "";

      // A chunk of data has been recieved.
      res.on("data", (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}
