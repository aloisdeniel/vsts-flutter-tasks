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
const task = require("azure-pipelines-task-lib/task");
const FLUTTER_TOOL_PATH_ENV_VAR = 'FlutterToolPath';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let args = task.getInput('arguments', false);
        let splittedArgs = args.split(' ')
            .map(function (x) {
            return x.trim();
        })
            .filter(function (x) {
            return x.length;
        });
        // Move current working directory to project
        let projectDirectory = task.getPathInput('projectDirectory', false, false);
        if (projectDirectory) {
            task.debug(`Moving to ${projectDirectory}`);
            task.cd(projectDirectory);
        }
        task.debug(`Project's directory : ${task.cwd()}`);
        var result = yield task.exec(FLUTTER_TOOL_PATH_ENV_VAR, splittedArgs);
        if (result !== 0) {
            task.setResult(task.TaskResult.Failed, "Command execution failed");
        }
        else {
            task.setResult(task.TaskResult.Succeeded, "Command execution succeeded");
        }
    });
}
