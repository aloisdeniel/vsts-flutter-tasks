import * as path from "path";
import * as xml2js from "xml2js";
import * as task from "azure-pipelines-task-lib/task";
import * as cp from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';

const FLUTTER_TOOL_PATH_ENV_VAR: string = 'FlutterToolPath';

async function main(): Promise<void> {
    // 1. Check flutter environment
    var flutterPath = task.getVariable(FLUTTER_TOOL_PATH_ENV_VAR) || process.env[FLUTTER_TOOL_PATH_ENV_VAR];
    flutterPath = path.join(flutterPath, "flutter")
    if (!flutterPath) {
        throw new Error(`The '${FLUTTER_TOOL_PATH_ENV_VAR}' environment variable must be set before using this task (you can use 'flutterinstall' task).`);
    }

    // 3. Move current working directory to project
    let projectDirectory = task.getPathInput('projectDirectory', false, false);
    if (projectDirectory) {
        task.debug(`Moving to ${projectDirectory}`);
        task.cd(projectDirectory);
    }

    // 4. Get inputs
    let testName = task.getInput('testName', false);
    let testPlainName = task.getInput('testPlainName', false);
    let updateGoldens = task.getBoolInput('updateGoldens', false);
    let coverage = task.getBoolInput('coverage', false);
    let verbose = task.getBoolInput('verbose', false);

    // 5. Running tests
    var results = await runTests(flutterPath, updateGoldens, testName, testPlainName, coverage, verbose);

    // 6. Publishing tests
    await publishTests(results);

    if (results.isSuccess) {
        task.setResult(task.TaskResult.Succeeded, `All tests passed`);
    }
    else {
        task.setResult(task.TaskResult.Failed, `Some tests failed`);
    }
}

async function publishTests(results: any) {
    var publisher = new task.TestPublisher("JUnit");

    task.debug(`results: ` + JSON.stringify(results));

    // 1. Generating Junit XML result file
    var junitResults = createJunitResults(results);
    var xmlBuilder = new xml2js.Builder();
    var xml = xmlBuilder.buildObject(junitResults);
    var xmlPath = path.join(task.cwd(), "junit.xml");
    task.writeFile(xmlPath, xml);

    // 2. Publishing to task
    publisher.publish([xmlPath], false, "", "", "", true, "VSTS - Flutter");
}

async function runTests(flutter: string, updateGoldens?: boolean, name?: string, plainName?: string, coverage?: boolean, verbose?: boolean): Promise<any> {
    var commandParts = [
        flutter,
        "test --pub --concurrency=1",
        updateGoldens ? "--update-goldens" : "",
        name ? " --name=" + name : "",
        plainName ? "--plan-name=" + plainName : "",
        coverage ? "--coverage" : "",
        verbose ? "--verbose" : "",
    ];

    var results = {
        isSuccess: true,
        succeeded: 0,
        failed: 0,
        cases: []
    };

    var command = commandParts.filter((part) => part != "").join(" ");

    console.log("Running child process: " + command);

    const childProcess = cp.exec(command);
    childProcess.stdout.removeAllListeners('data');

    var buffer = [];

    childProcess.stdout.on('data', (data) => {
        data = data.trim();
        buffer.push({
            data: data,
            time: new Date()
        });
        console.log(data);
    })

    return new Promise((resolve, reject) => {
        childProcess.stdout.on('close', () => {

            buffer.forEach(item => {
                const verboseRegex = /^\[.*/; // Filter out lines that start with a '[', since those are verbose lines
                let verboseMatch = verboseRegex.exec(item.data);

                const testSuiteRegex = /\s*\d\d:\d\d (\+\d+)?(\s+\-\d+)?:\s*loading\s*(.*\.dart)\s*/;
                let loadingMatch = testSuiteRegex.exec(item.data);
                if (!verboseMatch) {
                    if (!loadingMatch) {
                        createTestCase(results, item.data, item.time);
                    }
                }
            });

            if (results.cases.length > 0) {
                results.cases[results.cases.length - 1].ended = new Date();
            }
            resolve(results);
        });
    });
}

function createTestCase(results, data, time) {
    // '00:00 +0 <C:\dir\file.dart>: <test name>'
    const caseRegex = /\s*\d\d:\d\d (\+\d+)?(\s+\-\d+)?:\s*(.*\.dart.*):\s*(.*)/;
    // '00:00 +0 <C:\dir ... > <test name>'
    const unknownClassRegex = /\s*\d\d:\d\d (\+\d+)?(\s+\-\d+)?:\s*(.*\.\.\.)\s*(.*)/;
    // '00:00 +0 <test name>', except for '00:00 +0 All tests passed!' or '00:00 +0 Some tests failed.'
    const noClassRegex = /^(?!.*(All tests passed!|Some tests failed\.).*)\s*\d\d:\d\d (\+\d+)?(\s+\-\d+)?:\s*(.*)\s*/;

    var caseTitle = "";
    var caseClass = "unknown";

    let match = caseRegex.exec(data);
    if (match) {
        caseClass = match[3];
        caseTitle = match[4];
    } else {
        match = unknownClassRegex.exec(data);
        if (match) {
            caseTitle = match[4];
        } else {
            match = noClassRegex.exec(data);
            if (match) {
                caseTitle = match[4];
            }
        }
    }

    if (match) {
        var newCase = {
            caseClass: caseClass.trim(),
            caseTitle: caseTitle.trim(),
            isSuccess: true,
            started: time,
            ended: new Date,
        };
        var existingCase = results.cases.find((c) => c.caseClass == caseClass && c.caseTitle == newCase.caseTitle.replace(" [E]", ""));

        var successes = Number(match[1]);
        var failures = match[2] ? -Number(match[2]) : results.failed;

        if (results.failed == failures && (caseTitle.includes("(setUpAll)") || caseTitle.includes("tearDownAll"))) {
            return;
        }

        if (existingCase == null) {
            if (results.cases.length > 0) {
                results.cases[results.cases.length - 1].ended = newCase.started;
            }

            newCase.isSuccess = results.failed == failures;
            results.cases.push(newCase);
        } else {
            existingCase.caseTitle = newCase.caseTitle;
            existingCase.isSuccess = results.failed == failures;
        }

        results.succeeded = successes;
        results.failed = failures;
        results.isSuccess = results.failed == 0;
    }
}

function createJunitResults(results) {
    var testSuites = [];
    var testCases = [];

    results.cases.forEach(c => {
        var duration = (c.ended.getTime() - c.started.getTime());
        var s = (duration / 1000);
        var testCase = {
            "$": {
                "name": c.caseTitle,
                "classname": c.caseClass,
                "time": s,
            }
        };
        if (!c.isSuccess) {
            testCase["failure"] = {
                "$": {
                    "type": "FlutterError",
                }
            };
        }
        testCases.push(testCase);
    });

    var testSuite = {
        "$": {
            "name": "Test Suite",
            "timestamp": new Date().toISOString(),
            "errors": 0,
            "skipped": 0,
            "failures": results.failed,
            "tests": (results.failed + results.succeeded)
        },
        "testcase": testCases
    };
    testSuites.push(testSuite);

    return {
        "testsuites": {
            "testsuite": testSuites
        }
    };
}

main().catch(error => {
    task.setResult(task.TaskResult.Failed, error);
});