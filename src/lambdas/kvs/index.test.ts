import * as cassava from "cassava";
import * as chai from "chai";
import * as testUtils from "../../utils/testUtils";
import {setupTestDynamoTable, tearDownTestDynamoTable} from "../../utils/testUtils";
import {installEndpointsRest} from "./endpoints";

describe("/v1/storage", function () {
    this.timeout(10000);
    const router = new cassava.Router();

    before(async () => {
        router.route(testUtils.authRoute);
        installEndpointsRest(router);
        await setupTestDynamoTable();
    });

    after(async () => {
        await tearDownTestDynamoTable();
    });

    it("can list storage", async () => {
        const resp = await testUtils.testAuthedRequest<any>(router, "/v1/storage", "GET");
        chai.assert.equal(resp.statusCode, 200);
    });

    const key = "hello";
    const value = "world";
    it("can put object", async () => {
        const resp = await testUtils.testAuthedRequest<any>(router, `/v1/storage/${key}`, "PUT", value);
        chai.assert.equal(resp.statusCode, 200);
    });

    it("can get object", async () => {
        const resp = await testUtils.testAuthedRequest<any>(router, `/v1/storage/${key}`, "GET");
        chai.assert.equal(resp.statusCode, 200);
        chai.assert.equal(resp.body, value);
    });

    it("can list keys", async () => {
        const resp = await testUtils.testAuthedRequest<any>(router, `/v1/storage`, "GET");
        chai.assert.equal(resp.statusCode, 200);
        chai.assert.equal(resp.body.keys[0], key);
    });

    it("can delete object", async () => {
        const resp = await testUtils.testAuthedRequest<any>(router, `/v1/storage/${key}`, "DELETE");
        chai.assert.equal(resp.statusCode, 200);
    });

    it("can't get object that doesn't exist", async () => {
        const resp = await testUtils.testAuthedRequest<any>(router, `/v1/storage/DOES_NOT_EXIST`, "GET");
        chai.assert.equal(resp.statusCode, 404);
    });
});
