import "babel-polyfill";
import * as aws from "aws-sdk";
import * as dynameh from "dynameh";
import {httpStatusCode, RestError} from "cassava";
import {StoredItem} from "./StoredItem";

export const debug = true;

export const dynamodb = new aws.DynamoDB({
    apiVersion: "2012-08-10",
    credentials: process.env["AWS_REGION"] ? new aws.EnvironmentCredentials("AWS") : new aws.SharedIniFileCredentials({profile: "default"}),
    region: process.env["AWS_REGION"] || "us-west-2"
});

export const tableSchema: dynameh.TableSchema = {
    tableName: process.env["DDB_TABLE"] || "Storage",
    primaryKeyField: "giftbitUserId",
    primaryKeyType: "string",
    sortKeyField: "key",
    sortKeyType: "string"
};

export async function listKeys(giftbitUserId: string): Promise<string[]> {
    const queryRequest = dynameh.requestBuilder.addProjection(tableSchema, dynameh.requestBuilder.buildQueryInput(tableSchema, giftbitUserId), ["key"]);
    debug && console.log("queryRequest=", queryRequest);

    const queryResponse = await dynamodb.query(queryRequest).promise();
    debug && console.log("queryResponse=", queryResponse);

    const storedItems = dynameh.responseUnwrapper.unwrapQueryOutput(queryResponse) as StoredItem[];
    return storedItems.map(item => item.key);
}

export async function getStoredItem(giftbitUserId: string, key: string): Promise<StoredItem> {
    validateKey(key);

    const getRequest = dynameh.requestBuilder.buildGetInput(tableSchema, giftbitUserId, key);
    debug && console.log("getRequest=", getRequest);

    const getResponse = await dynamodb.getItem(getRequest).promise();
    debug && console.log("getResponse=", getResponse);

    const storedItem = dynameh.responseUnwrapper.unwrapGetOutput(getResponse) as StoredItem;
    debug && console.log("storedItem=", storedItem);

    return storedItem;
}

export async function setStoredItem(item: StoredItem): Promise<void> {
    if (!item.giftbitUserId) {
        throw new Error("item.giftbitUserId not set");
    }
    validateKey(item.key);

    const putRequest = dynameh.requestBuilder.buildPutInput(tableSchema, item);
    debug && console.log("putRequest=", putRequest);

    const putResponse = await dynamodb.putItem(putRequest).promise();
    debug && console.log("putResponse=", putResponse);
}

export async function deleteItem(giftbitUserId: string, key: string): Promise<void> {
    validateKey(key);

    const deleteRequest = dynameh.requestBuilder.buildDeleteInput(tableSchema, giftbitUserId, key);
    debug && console.log("deleteRequest=", deleteRequest);

    const deleteResponse = await dynamodb.deleteItem(deleteRequest).promise();
    debug && console.log("deleteResponse=", deleteResponse);
}

function validateKey(key: string): void {
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
