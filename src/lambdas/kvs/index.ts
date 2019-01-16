import * as cassava from "cassava";
import * as giftbitRoutes from "giftbit-cassava-routes";
import * as logPrefix from "loglevel-plugin-prefix";
import * as encryption from "./encryption";
import * as storedItemAccess from "./storedItemAccess";
import {StoredItem} from "./StoredItem";
import {specialKeys} from "./specialKeys";
import {DatabaseSharedSecretProvider} from "./DatabaseSharedSecretProvider";
import log = require("loglevel");
import {AWSError} from "aws-sdk";

// Prefix log messages with the level.
logPrefix.reg(log);
logPrefix.apply(log, {
    format: (level, name, timestamp) => {
        return `[${level}]`;
    },
});

// Set the log level when running in Lambda.
log.setLevel(log.levels.INFO);

export const router = new cassava.Router();

router.route(new cassava.routes.LoggingRoute({
    hideResponseBody: true,
    hideRequestBody: true,
    logFunction: log.info
}));
router.route(new giftbitRoutes.HealthCheckRoute("/v1/storage/healthCheck"));

router.route(new giftbitRoutes.jwtauth.JwtAuthorizationRoute({
    authConfigPromise: giftbitRoutes.secureConfig.fetchFromS3ByEnvVar<any>("SECURE_CONFIG_BUCKET", "SECURE_CONFIG_KEY_JWT"),
    rolesConfigPromise: giftbitRoutes.secureConfig.fetchFromS3ByEnvVar<any>("SECURE_CONFIG_BUCKET", "SECURE_CONFIG_KEY_ROLE_DEFINITIONS"),
    sharedSecretProvider: new DatabaseSharedSecretProvider(),
    infoLogFunction: log.info,
    errorLogFunction: log.error
}));

const defaultScope = "lightrailV1:portal";

router.route("/v1/storage")
    .method("GET")
    .handler(async evt => {
        const auth: giftbitRoutes.jwtauth.AuthorizationBadge = evt.meta["auth"];
        auth.requireIds("userId");
        auth.requireScopes(defaultScope);

        let keys: string[];
        try {
            keys = (await storedItemAccess.listKeys(auth.userId))
                .filter(key => !(specialKeys[key] && specialKeys[key].hidden));
        } catch (err) {
            throw kvsErrorFormatting(err)
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
        if (specialKeys[key] && specialKeys[key].readScopes) {
            auth.requireScopes(...specialKeys[key].readScopes);
        } else {
            auth.requireScopes(defaultScope);
        }

        let storedItem: StoredItem = null;
        try {
            await storedItemAccess.getStoredItem(auth.userId, key);
        } catch (err) {
            throw kvsErrorFormatting(err);
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
        if (specialKeys[key] && specialKeys[key].writeScopes) {
            auth.requireScopes(...specialKeys[key].writeScopes);
        } else {
            auth.requireScopes(defaultScope);
        }

        const value = evt.body;
        if (JSON.stringify(value).length > 10 * 1024) {
            throw new cassava.RestError(cassava.httpStatusCode.clientError.PAYLOAD_TOO_LARGE, "Payload too large.  The max value size is 10 KiB.");
        }

        let storedItem: StoredItem = {
            giftbitUserId: auth.userId,
            key,
            value
        };
        if (specialKeys[key] && specialKeys[key].encrypted) {
            storedItem = await encryption.encryptStoredItem(auth, storedItem);
        }

        try {
            await storedItemAccess.setStoredItem(storedItem);
        } catch (err) {
            throw kvsErrorFormatting(err);
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
        if (specialKeys[key] && specialKeys[key].writeScopes) {
            auth.requireScopes(...specialKeys[key].writeScopes);
        } else {
            auth.requireScopes(defaultScope);
        }

        try {
            await storedItemAccess.deleteItem(auth.userId, key);
        } catch (err) {
            throw kvsErrorFormatting(err);
        }

        return {
            body: {
                success: true
            }
        };
    });

// Checks for if the error is an AWS retryable error.
// Timeouts are instances of retryable errors and as such KVS will return a 503 in this case.
function kvsErrorFormatting(err: any): any {
    if (err instanceof AWSError && err.retryable) {
        log.error(`AWS retryable error occurred. ${JSON.stringify(err)}`);
        return new cassava.RestError(503, "AWS Error occurred. " + err.message);
    } else {
        return err;
    }
}

//noinspection JSUnusedGlobalSymbols
// Export the lambda handler with Sentry error logging supported.
export const handler = giftbitRoutes.sentry.wrapLambdaHandler({
    router,
    logger: log.error,
    secureConfig: giftbitRoutes.secureConfig.fetchFromS3ByEnvVar<any>("SECURE_CONFIG_BUCKET", "SECURE_CONFIG_KEY_SENTRY")
});
