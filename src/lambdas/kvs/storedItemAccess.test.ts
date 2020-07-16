import * as aws from "aws-sdk";
import * as chai from "chai";
import * as storedItemAccess from "./storedItemAccess";
import * as testingDynamo from "../../utils/testUtils/testingDynamo";
import {setupTestDynamoTable, tearDownTestDynamoTable} from "../../utils/testUtils";

describe("storedItemAccess", function () {

    this.timeout(10000);

    const accountId = "accountId";

    before(async () => {
        (storedItemAccess as any).debug = false;
        storedItemAccess.dynamodb.endpoint = new aws.Endpoint(testingDynamo.endpoint);

        await setupTestDynamoTable();
    });

    after(async () => {
        await tearDownTestDynamoTable();
    });

    it("gets null if an item is not found", async () => {
        const item = await storedItemAccess.getStoredItem(accountId, "nothinghere");
        chai.assert.isNull(item);
    });

    it("gets the item that was set", async () => {
        await storedItemAccess.setStoredItem({
            accountId: accountId,
            key: "somethinghere",
            value: {
                woozle: "wuzzle"
            }
        });

        const item = await storedItemAccess.getStoredItem(accountId, "somethinghere");
        chai.assert.deepEqual(item, {
            accountId: accountId,
            key: "somethinghere",
            value: {
                woozle: "wuzzle"
            }
        });
    });

    it("does not return items for a different accountId", async () => {
        await storedItemAccess.setStoredItem({
            accountId: "differentuser",
            key: "somethingelse",
            value: 11
        });

        const item = await storedItemAccess.getStoredItem(accountId, "somethingelse");
        chai.assert.isNull(item);
    });

    it("can delete set items", async () => {
        await storedItemAccess.setStoredItem({
            accountId: accountId,
            key: "somethingmore",
            value: "123123"
        });

        const item = await storedItemAccess.getStoredItem(accountId, "somethingmore");
        chai.assert.deepEqual(item, {
            accountId: accountId,
            key: "somethingmore",
            value: "123123"
        });

        await storedItemAccess.deleteItem(accountId, "somethingmore");

        const item2 = await storedItemAccess.getStoredItem(accountId, "somethingmore");
        chai.assert.isNull(item2);
    });

    it("throws no errors when deleting a non-existant item", async () => {
        await storedItemAccess.deleteItem(accountId, "afafjhfjhgsdfjhfkjsdfkjsdfh");
    });

    it("lists items for the user only", async () => {
        await storedItemAccess.setStoredItem({
            accountId: accountId,
            key: "seethistoo",
            value: {a: {a: {a: "a"}}}
        });
        await storedItemAccess.setStoredItem({
            accountId: "somejerk",
            key: "dontseethis",
            value: {a: {a: {a: "a"}}}
        });

        const keys = await storedItemAccess.listKeys(accountId);
        chai.assert.sameMembers(keys, ["somethinghere", "seethistoo"]);
    });
});
