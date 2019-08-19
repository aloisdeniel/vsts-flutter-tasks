"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const mr = require("azure-pipelines-task-lib/mock-run");
const taskPath = path.join(__dirname, "../index.js");
var runner = new mr.TaskMockRunner(taskPath);
function assertDirectory(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}
// ENV
const rootPath = path.join(__dirname, "..", "..", "..");
const tempPath = path.join(rootPath, "temp");
const agentPath = path.join(tempPath, "agent");
const dropPath = path.join(tempPath, "drop");
process.env["BUILD_BUILDNUMBER"] = "1";
assertDirectory(tempPath);
assertDirectory(agentPath);
assertDirectory(dropPath);
assertDirectory(process.env["AGENT_HOMEDIRECTORY"] = path.join(agentPath, "home"));
assertDirectory(process.env["AGENT_TOOLSDIRECTORY"] = path.join(agentPath, "tools"));
assertDirectory(process.env["AGENT_TEMPDIRECTORY"] = path.join(agentPath, "temp"));
assertDirectory(process.env["AGENT_BUILDDIRECTORY"] = path.join(agentPath, "build"));
// Run install tests
process.env["FlutterToolPath"] = path.join(agentPath, "tools", "Flutter", "0.8.2-beta", "macos", "flutter", "bin");
runner.setInput("projectDirectory", path.join(rootPath, "sample_project"));
// runner.setInput("coverage", "true");
// runner.setInput("verbose", "true");
runner.run(true);
