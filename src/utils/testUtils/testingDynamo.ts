import * as aws from "aws-sdk";
import * as storedItemAccess from "../../lambdas/kvs/storedItemAccess";
import {ChildProcess} from "child_process";
import localDynamo = require("local-dynamo");
import log = require("loglevel");

export const endpoint = "http://localhost:9753";
let dynamoProcess: ChildProcess;

before("set up local dynamo process", async function () {
    this.timeout(120000);

    log.debug("Launching local-dynamo");
    dynamoProcess = localDynamo.launch(null, 9753);

    log.debug("Waiting for local-dynamo to finish launching...");
    storedItemAccess.dynamodb.endpoint = new aws.Endpoint(endpoint);
    await storedItemAccess.dynamodb.listTables().promise();
    log.debug("local-dynamo ready");
});

after("tear down local dynamo process", () => {
    log.debug("Killing local-dynamo");
    dynamoProcess.kill();
    dynamoProcess = null;
});
