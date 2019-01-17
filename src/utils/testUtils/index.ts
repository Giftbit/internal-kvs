import * as cassava from "cassava";
import * as chai from "chai";
import * as giftbitRoutes from "giftbit-cassava-routes";
import {AuthorizationBadge} from "giftbit-cassava-routes/dist/jwtauth";
import * as storedItemAccess from "../../lambdas/kvs/storedItemAccess";
import * as aws from "aws-sdk";
import * as testingDynamo from "../../testingDynamo";
import * as dynameh from "dynameh";
import log = require("loglevel");
import uuid = require("uuid");

const rolesConfig = require("./rolesConfig.json");

(storedItemAccess as any).debug = false;
storedItemAccess.dynamodb.endpoint = new aws.Endpoint(testingDynamo.endpoint);

export async function setupTestDynamoTable(): Promise<void> {
    try {
        await storedItemAccess.dynamodb.createTable(dynameh.requestBuilder.buildCreateTableInput(storedItemAccess.tableSchema)).promise();
    } catch (err) {
        if (err.code == "ResourceInUseException") {
            // table already exists
        } else {
            throw err;
        }
    }
}

export async function tearDownTestDynamoTable(): Promise<void> {
    await storedItemAccess.dynamodb.deleteTable({TableName: storedItemAccess.tableSchema.tableName});
}

export const defaultTestUser = {
    userId: "default-test-user-TEST",
    teamMemberId: "default-test-user-TEST",
    jwt: "eyJ2ZXIiOjIsInZhdiI6MSwiYWxnIjoiSFMyNTYiLCJ0eXAiOiJKV1QifQ.eyJnIjp7Imd1aSI6ImRlZmF1bHQtdGVzdC11c2VyLVRFU1QiLCJnbWkiOiJkZWZhdWx0LXRlc3QtdXNlci1URVNUIiwidG1pIjoiZGVmYXVsdC10ZXN0LXVzZXItVEVTVCJ9LCJpYXQiOiIyMDE3LTAzLTA3VDE4OjM0OjA2LjYwMyswMDAwIiwianRpIjoiYmFkZ2UtZGQ5NWI5YjU4MmU4NDBlY2JhMWNiZjQxMzY1ZDU3ZTEiLCJzY29wZXMiOltdLCJyb2xlcyI6WyJhY2NvdW50TWFuYWdlciIsImNvbnRhY3RNYW5hZ2VyIiwiY3VzdG9tZXJTZXJ2aWNlTWFuYWdlciIsImN1c3RvbWVyU2VydmljZVJlcHJlc2VudGF0aXZlIiwicG9pbnRPZlNhbGUiLCJwcm9ncmFtTWFuYWdlciIsInByb21vdGVyIiwicmVwb3J0ZXIiLCJzZWN1cml0eU1hbmFnZXIiLCJ0ZWFtQWRtaW4iLCJ3ZWJQb3J0YWwiXX0.Pz9XaaNX3HenvSUb6MENm_KEBheztiscGr2h2TJfhIc",
    auth: new AuthorizationBadge({
        "g": {
            "gui": "default-test-user-TEST",
            "gmi": "default-test-user-TEST",
            "tmi": "default-test-user-TEST",
        },
        "iat": "2017-03-07T18:34:06.603+0000",
        "jti": "badge-dd95b9b582e840ecba1cbf41365d57e1",
        "scopes": [],
        "roles": [
            "accountManager",
            "contactManager",
            "customerServiceManager",
            "customerServiceRepresentative",
            "pointOfSale",
            "programManager",
            "promoter",
            "reporter",
            "securityManager",
            "teamAdmin",
            "webPortal"
        ]
    })
};

export const alternateTestUser = {
    userId: "alternate-test-user-TEST",
    teamMemberId: "alternate-test-user-TEST",
    jwt: "eyJ2ZXIiOjIsInZhdiI6MSwiYWxnIjoiSFMyNTYiLCJ0eXAiOiJKV1QifQ.eyJnIjp7Imd1aSI6ImFsdGVybmF0ZS10ZXN0LXVzZXItVEVTVCIsImdtaSI6ImFsdGVybmF0ZS10ZXN0LXVzZXItVEVTVCIsInRtaSI6ImFsdGVybmF0ZS10ZXN0LXVzZXItVEVTVCJ9LCJpYXQiOiIyMDE4LTAzLTIzVDIxOjI1OjI2LjgxMiswMDAwIiwianRpIjoiYmFkZ2UtMmYxOGZkMjk2YmNkNDg4ZWFkODUzNTllYjY2ODA0MTkiLCJzY29wZXMiOltdLCJyb2xlcyI6WyJhY2NvdW50TWFuYWdlciIsImNvbnRhY3RNYW5hZ2VyIiwiY3VzdG9tZXJTZXJ2aWNlTWFuYWdlciIsImN1c3RvbWVyU2VydmljZVJlcHJlc2VudGF0aXZlIiwicG9pbnRPZlNhbGUiLCJwcm9ncmFtTWFuYWdlciIsInByb21vdGVyIiwicmVwb3J0ZXIiLCJzZWN1cml0eU1hbmFnZXIiLCJ0ZWFtQWRtaW4iLCJ3ZWJQb3J0YWwiXX0.9Xdsk8q4dLTp5baeeP_kHi61C0jU8pvFshUhCmoDLbY",
    auth: new AuthorizationBadge({
        "g": {
            "gui": "alternate-test-user-TEST",
            "gmi": "alternate-test-user-TEST",
            "tmi": "alternate-test-user-TEST"
        },
        "iat": "2018-03-23T21:25:26.812+0000",
        "jti": "badge-2f18fd296bcd488ead85359eb6680419",
        "scopes": [],
        "roles": [
            "accountManager",
            "contactManager",
            "customerServiceManager",
            "customerServiceRepresentative",
            "pointOfSale",
            "programManager",
            "promoter",
            "reporter",
            "securityManager",
            "teamAdmin",
            "webPortal"
        ]
    })
};

/**
 * A Cassava Route that enables authorization with the above JWTs.
 */
export const authRoute: cassava.routes.Route = new giftbitRoutes.jwtauth.JwtAuthorizationRoute({
    authConfigPromise: Promise.resolve({secretkey: "secret"}),
    rolesConfigPromise: Promise.resolve(rolesConfig),
    infoLogFunction: () => {
        // too noisy for testing
    },
    errorLogFunction: log.error
});


export interface ParsedProxyResponse<T> {
    statusCode: number;
    headers: {
        [key: string]: string;
    };
    body: T;
}

/**
 * Make a simple authed request to the router with the default test user.
 */
export async function testAuthedRequest<T>(router: cassava.Router, url: string, method: string, body?: any): Promise<ParsedProxyResponse<T>> {
    const resp = await cassava.testing.testRouter(router, cassava.testing.createTestProxyEvent(url, method, {
        headers: {
            Authorization: `Bearer ${defaultTestUser.jwt}`
        },
        body: body && JSON.stringify(body) || undefined
    }));

    chai.assert.equal(resp.headers["Content-Type"], "application/json");

    return {
        statusCode: resp.statusCode,
        headers: resp.headers,
        body: resp.body && JSON.parse(resp.body) || undefined
    };
}

export function generateId(length?: number): string {
    return (uuid.v4() + uuid.v4()).substring(0, length != null ? length : 20);
}