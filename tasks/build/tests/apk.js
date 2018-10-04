"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const mr = require("vsts-task-lib/mock-run");
const taskPath = path.join(__dirname, "../index.js");
var runner = new mr.TaskMockRunner(taskPath);
function assertDirectory(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}
// ENV
const tempPath = path.join(__dirname, "..", "..", "..", "temp");
const agentPath = path.join(tempPath, "agent");
process.env["BUILD_BUILDNUMBER"] = "1";
assertDirectory(tempPath);
assertDirectory(agentPath);
assertDirectory(process.env["AGENT_HOMEDIRECTORY"] = path.join(agentPath, "home"));
assertDirectory(process.env["AGENT_TOOLSDIRECTORY"] = path.join(agentPath, "tools"));
assertDirectory(process.env["AGENT_TEMPDIRECTORY"] = path.join(agentPath, "temp"));
assertDirectory(process.env["AGENT_BUILDDIRECTORY"] = path.join(agentPath, "build"));
// Run install tests
process.env["FlutterToolPath"] = path.join(agentPath, "tools", "Flutter", "0.9.6-dev", "macos", "flutter", "bin");
runner.setInput("target", "apk");
runner.setInput("buildName", "com.aloisdeniel.vsts");
runner.setInput("buildNumber", "12");
runner.setInput("projectDirectory", path.join(tempPath, "sample_project"));
runner.run(true);
