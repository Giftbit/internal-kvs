import {ChildProcess} from "child_process";
const localDynamo = require("local-dynamo");    // no d.ts

export const endpoint = "http://localhost:9753";
let dynamoProcess: ChildProcess;

before("set up local dynamo process", () => {
    dynamoProcess = localDynamo.launch(null, 9753);
});

after("tear down local dynamo process", () => {
    dynamoProcess.kill();
    dynamoProcess = null;
});
