import * as path from "path";
import * as xml2js from "xml2js";
import * as task from "vsts-task-lib/task";

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
    let concurrency = task.getInput('concurrency', false);
	let coverage = task.getBoolInput('coverage', false);
	let verbose = task.getBoolInput('verbose', false);

    // 5. Running tests
    var results = await runTests(flutterPath, (concurrency ? Number(concurrency) : null), updateGoldens, testName, testPlainName, coverage, verbose);

    // 6. Publishing tests
    await publishTests(results);

    if(results.isSuccess) {
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
    publisher.publish([ xmlPath ], false, "", "", "", true, "VSTS - Flutter");
}

async function runTests(flutter: string, concurrency?: number, updateGoldens?: boolean, name?: string, plainName?: string, coverage?: boolean, verbose?: boolean) {
    let testRunner = task.tool(flutter);
    testRunner.arg(['test', '--pub']);

    if (updateGoldens) {
        testRunner.arg("--update-goldens");
    }

    if (name) {
        testRunner.arg("--name=" + name);
    }

    if (plainName) {
        testRunner.arg("--plain-name=" + plainName);
    }

    if (concurrency) {
        testRunner.arg("--concurrency=" + concurrency);
    }
	
	if (coverage) {
        testRunner.arg("--coverage");
    }
	
	if (verbose) {
        testRunner.arg("--verbose");
    }

    var currentSuite : any = null;
    var results = {
        isSuccess: false,
        suites: []
    };

    testRunner.on('stdout', line => {
        const testSuiteRegex = /\s*\d\d:\d\d (\+\d+)?(\s+\-\d+)?:\s*loading\s*(.*\.dart)\s*/;
        let loadingMatch = testSuiteRegex.exec(line);
        if(loadingMatch) {
            var newSuite = {
                title: path.basename(loadingMatch[3], ".dart"),
                isSuccess: false,
                succeeded: 0,
                failed: 0,
                cases: []
            }
            
            if(!currentSuite || newSuite.title !== currentSuite.title) {
                currentSuite = newSuite;
                results.suites.push(newSuite);
            }
        }
        else {
            createTestCase(currentSuite, line);
        }
    });

    try {
        await testRunner.exec();
        results.isSuccess = true;
    }
    catch {}

    return results;
}

function createTestCase(suite: any, output: string) {
    const testRunRegex = /\s*\d\d:\d\d (\+\d+)?(\s+\-\d+)?:\s*(.*)/;
    let match = testRunRegex.exec(output);
    if (match) {
        var title = match[3];
        var successes = Number(match[1]);
        var failures = match[2] ? -Number(match[2]) : suite.failed;
        
        var newCase ={ 
            title: title.trim(),
            isSuccess: false, 
            started: new Date(),
            ended: new Date,
        };

        var hasNewCase = false;

        if(suite.succeeded != successes) {
            suite.succeeded = successes;
            newCase.isSuccess = true;
            hasNewCase = true;
        }
        else if(suite.failed != failures) {
            suite.failed = failures;
            newCase.isSuccess = false;
            hasNewCase = true;
        }

        if(hasNewCase) {
            if(suite.cases.length > 0) {
                suite.cases[suite.cases.length - 1].ended = newCase.started;
            }
            suite.cases.push(newCase);
        }
    }
}

function createJunitResults(results:any) {
    var testSuites = [];

    results.suites.forEach(suite => {
        var testCases = [];
        suite.cases.forEach(c => {
            var duration = (c.ended.getTime() - c.started.getTime());
            var s = (duration / 1000);
            var testCase = {
                "$": { 
                    "name": c.title,
                    "classname": c.title,
                    "time": s,
                }
            };

            if(!c.isSuccess) {
                testCase["failure"] = {
                    "$": { 
                        "type": "FlutterError",
                    }
                }
            }
    
            testCases.push(testCase);
        });

        var testSuite = {
            "$": { 
                "name": suite.title,
                "timestamp": new Date().toISOString(),
                "errors": 0, // TODO 
                "skipped": 0, // TODO 
                "failures": suite.failed, 
                "tests": (suite.failed + suite.succeeded) 
            },
            "testcase": testCases
        };
        testSuites.push(testSuite);
    });

    return {
        "testsuites" : {
            "testsuite" : testSuites
        }
    };
}

main().catch(error => {
    task.setResult(task.TaskResult.Failed, error);
});