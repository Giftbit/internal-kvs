import * as aws from "aws-sdk";
import * as chai from "chai";
import * as storedItemAccess from "./storedItemAccess";
import * as testingDynamo from "../../testingDynamo";
import {setupTestDynamoTable, tearDownTestDynamoTable} from "../../utils/testUtils";

describe("storedItemAccess", function () {

    this.timeout(10000);

    const giftbitUserId = "giftbitUserId";

    before(async () => {
        (storedItemAccess as any).debug = false;
        storedItemAccess.dynamodb.endpoint = new aws.Endpoint(testingDynamo.endpoint);

        await setupTestDynamoTable();
    });

    after(async () => {
        await tearDownTestDynamoTable();
    });

    it("gets null if an item is not found", async () => {
        const item = await storedItemAccess.getStoredItem(giftbitUserId, "nothinghere");
        chai.assert.isNull(item);
    });

    it("gets the item that was set", async () => {
        await storedItemAccess.setStoredItem({
            giftbitUserId,
            key: "somethinghere",
            value: {
                woozle: "wuzzle"
            }
        });

        const item = await storedItemAccess.getStoredItem(giftbitUserId, "somethinghere");
        chai.assert.deepEqual(item, {
            giftbitUserId,
            key: "somethinghere",
            value: {
                woozle: "wuzzle"
            }
        });
    });

    it("does not return items for a different giftbitUserId", async () => {
        await storedItemAccess.setStoredItem({
            giftbitUserId: "differentuser",
            key: "somethingelse",
            value: 11
        });

        const item = await storedItemAccess.getStoredItem(giftbitUserId, "somethingelse");
        chai.assert.isNull(item);
    });

    it("can delete set items", async () => {
        await storedItemAccess.setStoredItem({
            giftbitUserId,
            key: "somethingmore",
            value: "123123"
        });

        const item = await storedItemAccess.getStoredItem(giftbitUserId, "somethingmore");
        chai.assert.deepEqual(item, {
            giftbitUserId,
            key: "somethingmore",
            value: "123123"
        });

        await storedItemAccess.deleteItem(giftbitUserId, "somethingmore");

        const item2 = await storedItemAccess.getStoredItem(giftbitUserId, "somethingmore");
        chai.assert.isNull(item2);
    });

    it("throws no errors when deleting a non-existant item", async () => {
        await storedItemAccess.deleteItem(giftbitUserId, "afafjhfjhgsdfjhfkjsdfkjsdfh");
    });

    it("lists items for the user only", async () => {
        await storedItemAccess.setStoredItem({
            giftbitUserId,
            key: "seethistoo",
            value: {a: {a: {a: "a"}}}
        });
        await storedItemAccess.setStoredItem({
            giftbitUserId: "somejerk",
            key: "dontseethis",
            value: {a: {a: {a: "a"}}}
        });

        const keys = await storedItemAccess.listKeys(giftbitUserId);
        chai.assert.sameMembers(keys, ["somethinghere", "seethistoo"]);
    });
});
