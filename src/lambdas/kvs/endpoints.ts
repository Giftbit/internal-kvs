import * as giftbitRoutes from "giftbit-cassava-routes";
import * as storedItemAccess from "./storedItemAccess";
import {specialKeys} from "./specialKeys";
import {StoredItem} from "./StoredItem";
import * as cassava from "cassava";
import * as encryption from "./encryption";
import {AWSError} from "aws-sdk";
import log = require("loglevel");

const defaultScope = "lightrailV1:portal";

export function installEndpointsRest(router: cassava.Router): void {
    router.route("/v1/storage")
        .method("GET")
        .handler(async evt => {
            const auth: giftbitRoutes.jwtauth.AuthorizationBadge = evt.meta["auth"];
            auth.requireIds("userId");
            auth.requireScopes(defaultScope);

            let keys: string[];
            try {
                keys = (await storedItemAccess.listKeys(auth.userId))
                    .filter(key => !(specialKeys[key]?.hidden));
            } catch (err) {
                handleStoredItemAccessError(err);
            }

            return {
                body: {
                    keys
                },
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                }
            };
        });

    router.route("/v1/storage/{key}")
        .method("GET")
        .handler(async evt => {
            const auth: giftbitRoutes.jwtauth.AuthorizationBadge = evt.meta["auth"];
            auth.requireIds("userId");

            const key = evt.pathParameters.key;
            if (specialKeys[key]?.readScopes) {
                auth.requireScopes(...specialKeys[key].readScopes);
            } else {
                auth.requireScopes(defaultScope);
            }

            let storedItem: StoredItem = null;
            try {
                storedItem = await storedItemAccess.getStoredItem(auth.userId, key);
            } catch (err) {
                handleStoredItemAccessError(err);
            }
            if (storedItem == null) {
                throw new cassava.RestError(cassava.httpStatusCode.clientError.NOT_FOUND, "Resource not found.  The resource type was understood but nothing lives there.");
            }
            if (storedItem.encrypted) {
                storedItem = await encryption.dencryptStoredItem(auth, storedItem);
            }

            return {
                body: storedItem.value,
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                }
            };
        });

    router.route("/v1/storage/{key}")
        .method("PUT")
        .handler(async evt => {
            const auth: giftbitRoutes.jwtauth.AuthorizationBadge = evt.meta["auth"];
            auth.requireIds("userId");

            const key = evt.pathParameters.key;
            if (specialKeys[key]?.writeScopes) {
                auth.requireScopes(...specialKeys[key].writeScopes);
            } else {
                auth.requireScopes(defaultScope);
            }

            const value = evt.body;
            if (JSON.stringify(value).length > 10 * 1024) {
                throw new cassava.RestError(cassava.httpStatusCode.clientError.PAYLOAD_TOO_LARGE, "Payload too large.  The max value size is 10 KiB.");
            }

            let storedItem: StoredItem = {
                accountId: auth.userId,
                key,
                value
            };
            if (specialKeys[key]?.encrypted) {
                storedItem = await encryption.encryptStoredItem(auth, storedItem);
            }

            try {
                await storedItemAccess.setStoredItem(storedItem);
            } catch (err) {
                handleStoredItemAccessError(err);
            }

            return {
                body: {
                    success: true
                }
            };
        });

    router.route("/v1/storage/{key}")
        .method("DELETE")
        .handler(async evt => {
            const auth: giftbitRoutes.jwtauth.AuthorizationBadge = evt.meta["auth"];
            auth.requireIds("userId");

            const key = evt.pathParameters.key;
            if (specialKeys[key]?.writeScopes) {
                auth.requireScopes(...specialKeys[key].writeScopes);
            } else {
                auth.requireScopes(defaultScope);
            }

            try {
                await storedItemAccess.deleteItem(auth.userId, key);
            } catch (err) {
                throw handleStoredItemAccessError(err);
            }

            return {
                body: {
                    success: true
                }
            };
        });

    /**
     * Checks if the error is an AWS retryable error.
     * Dynamo timeouts are instances of retryable errors and as such KVS will return a 503.
     */
    function handleStoredItemAccessError(err: any): void {
        if ((err as AWSError) && err.retryable) {
            log.error(`AWS retryable error occurred. ${JSON.stringify(err)}`);
            throw new cassava.RestError(503, "AWS Error occurred. " + err.message);
        } else {
            throw err;
        }
    }
}
