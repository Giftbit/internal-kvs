import * as aws from "aws-sdk";
import * as dynameh from "dynameh";
import {httpStatusCode, RestError} from "cassava";
import {StoredItem} from "./StoredItem";
import {specialKeys} from "./specialKeys";
import log = require("loglevel");

export const dynamodb = new aws.DynamoDB({
    apiVersion: "2012-08-10",
    credentials: process.env["AWS_REGION"] ? new aws.EnvironmentCredentials("AWS") : new aws.SharedIniFileCredentials({profile: "default"}),
    region: process.env["AWS_REGION"] || "us-west-2",
    httpOptions: {
        // Both being 10s sets a maxium DDB timeout to be 20s.
        timeout: 10000,
        connectTimeout: 10000
    }
});

export const tableSchema: dynameh.TableSchema = {
    tableName: process.env["DDB_TABLE"] || "Storage",
    partitionKeyField: "accountId",
    partitionKeyType: "string",
    sortKeyField: "key",
    sortKeyType: "string"
};

export async function listKeys(accountId: string): Promise<string[]> {
    const queryRequest = dynameh.requestBuilder.buildQueryInput(tableSchema, accountId);
    dynameh.requestBuilder.addProjection(tableSchema, queryRequest, ["key"]);
    log.debug("queryRequest=", queryRequest);

    const queryResponse = await dynamodb.query(queryRequest).promise();
    log.debug("queryResponse=", queryResponse);

    const storedItems = dynameh.responseUnwrapper.unwrapQueryOutput(queryResponse) as StoredItem[];
    return storedItems.map(item => item.key);
}

export async function getStoredItem(accountId: string, key: string): Promise<StoredItem> {
    validateKey(key);

    const getRequest = dynameh.requestBuilder.buildGetInput(tableSchema, accountId, key);
    log.debug("getRequest=", getRequest);

    const getResponse = await dynamodb.getItem(getRequest).promise();
    log.debug("getResponse=", JSON.stringify(getResponse));

    const storedItem = dynameh.responseUnwrapper.unwrapGetOutput(getResponse) as StoredItem;
    log.debug("storedItem=", JSON.stringify(storedItem));

    return storedItem;
}

export async function setStoredItem(item: StoredItem): Promise<void> {
    if (!item.accountId) {
        throw new Error("item.accountId not set");
    }
    validateKey(item.key);

    const putRequest = dynameh.requestBuilder.buildPutInput(tableSchema, item);
    log.debug("putRequest=", JSON.stringify(putRequest));

    const putResponse = await dynamodb.putItem(putRequest).promise();
    log.debug("putResponse=", JSON.stringify(putResponse));
}

export async function deleteItem(accountId: string, key: string): Promise<void> {
    validateKey(key);

    const itemToDelete: Partial<StoredItem> = {accountId: accountId, key: key};
    const deleteRequest = dynameh.requestBuilder.buildDeleteInput(tableSchema, itemToDelete);
    log.debug("deleteRequest=", JSON.stringify(deleteRequest));

    const deleteResponse = await dynamodb.deleteItem(deleteRequest).promise();
    log.debug("deleteResponse=", JSON.stringify(deleteResponse));
}

export async function validateDatabaseReachable(): Promise<string> {
    try {
        const req = dynameh.requestBuilder.buildDescribeTableInput(tableSchema);
        await dynamodb.describeTable(req).promise();
    } catch (err) {
        log.error("Error describing table:", err);
        throw new Error("Unreachable.");
    }
    return "Ok.";
}

function validateKey(key: string): void {
    if (specialKeys[key]) {
        // Special keys are always by definition valid.
        return;
    }
    if (!key || key.length < 4) {
        throw new RestError(httpStatusCode.clientError.UNPROCESSABLE_ENTITY, "A key must be at least 4 characters.");
    }
    if (key.length > 128) {
        throw new RestError(httpStatusCode.clientError.UNPROCESSABLE_ENTITY, "A key cannot be more than 128 characters.");
    }
    if (!/^[a-z]/i.test(key)) {
        throw new RestError(httpStatusCode.clientError.UNPROCESSABLE_ENTITY, "A key must start with a letter (a-z).");
    }
    if (!/^[a-z][a-z0-9_-]*$/i.test(key)) {
        throw new RestError(httpStatusCode.clientError.UNPROCESSABLE_ENTITY, "A key can only contain letters (a-z), numbers (0-9), underscore (_) and dash (-).");
    }
}
