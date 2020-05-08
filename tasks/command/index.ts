import * as path from "path";
import * as task from "azure-pipelines-task-lib/task";

const FLUTTER_TOOL_PATH_ENV_VAR: string = 'FlutterToolPath';

async function main(): Promise<void> {
    let args = task.getInput('arguments', false);
    let splittedArgs = args.split(' ')
        .map(function (x) {
            return x.trim();
        })
        .filter(function (x) {
            return x.length;
        });

    var result = await task.exec(FLUTTER_TOOL_PATH_ENV_VAR, splittedArgs);

    if (result !== 0) {
        task.setResult(task.TaskResult.Failed, "Command execution failed");
    }
    else {
        task.setResult(task.TaskResult.Succeeded, "Commaned execution succeeded");
    }

}