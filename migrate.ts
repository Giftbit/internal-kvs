import * as aws from "aws-sdk";
import * as dynameh from "dynameh";
import log = require("loglevel");
import logPrefix = require("loglevel-plugin-prefix");

// Migrates data from the old KVS table (which had a random name)
// to the new table which take the name of the stack.  Also migrates
// over the key structure while we're at it.

const fromTable = "dev-Kvs-Table-167SCXFBAF4K3";
const toTable = "dev-Kvs";
const awsProfile = "default";

async function main(): Promise<void> {
    const fromSchema: dynameh.TableSchema = {
        tableName: fromTable,
        partitionKeyField: "giftbitUserId",
        partitionKeyType: "string",
        sortKeyField: "key",
        sortKeyType: "string"
    };

    const toSchema: dynameh.TableSchema = {
        tableName: toTable,
        partitionKeyField: "accountId",
        partitionKeyType: "string",
        sortKeyField: "key",
        sortKeyType: "string"
    };

    const dynamodb = new aws.DynamoDB({
        apiVersion: "2012-08-10",
        credentials: new aws.SharedIniFileCredentials({profile: awsProfile}),
        region: process.env["AWS_REGION"] || "us-west-2"
    });

    log.info("Beginning migration...");
    let itemCount = 0;
    const scanReq = dynameh.requestBuilder.buildScanInput(fromSchema);
    await dynameh.scanHelper.scanByCallback(dynamodb, scanReq, async items => {
        for (const item of items) {
            item.accountId = item.giftbitUserId;
            delete item.giftbitUserId;
        }

        const batchPutReq = dynameh.requestBuilder.buildBatchPutInput(toSchema, items);
        await dynameh.batchHelper.batchWriteAll(dynamodb, batchPutReq);
        log.info(`Migrated ${itemCount += items.length} items...`);
        return true;
    });
    log.info("Migration complete...");
}

const logColors = {
    "TRACE": "\u001b[0;32m",    // green
    "DEBUG": "\u001b[0;36m",    // cyan
    "INFO": "\u001b[0;34m",     // blue
    "WARN": "\u001b[0;33m",     // yellow
    "ERROR": "\u001b[0;31m"     // red
};

// Prefix log messages with the level.
logPrefix.reg(log);
logPrefix.apply(log, {
    format: (level, name, timestamp) => {
        return `[${logColors[level]}${level}\u001b[0m]`;
    }
});
log.setLevel(process.env["DEBUG"] ? log.levels.DEBUG : log.levels.INFO);

main().then(log.info).catch(log.error);
