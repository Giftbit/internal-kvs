import * as cassava from "cassava";
import * as giftbitRoutes from "giftbit-cassava-routes";
import * as logPrefix from "loglevel-plugin-prefix";
import {DatabaseSharedSecretProvider} from "./DatabaseSharedSecretProvider";
import {installEndpointsRest} from "./endpoints";
import log = require("loglevel");

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
router.route(new giftbitRoutes.HealthCheckRoute("/v1/storage/healthCheck", {v: async () => "2"}));

router.route(new giftbitRoutes.jwtauth.JwtAuthorizationRoute({
    authConfigPromise: giftbitRoutes.secureConfig.fetchFromS3ByEnvVar<any>("SECURE_CONFIG_BUCKET", "SECURE_CONFIG_KEY_JWT"),
    rolesConfigPromise: giftbitRoutes.secureConfig.fetchFromS3ByEnvVar<any>("SECURE_CONFIG_BUCKET", "SECURE_CONFIG_KEY_ROLE_DEFINITIONS"),
    sharedSecretProvider: new DatabaseSharedSecretProvider(),
    infoLogFunction: log.info,
    errorLogFunction: log.error,
    onAuth: auth => giftbitRoutes.sentry.setSentryUser(auth)
}));

installEndpointsRest(router);

//noinspection JSUnusedGlobalSymbols
// Export the lambda handler with Sentry error logging supported.
export const handler = giftbitRoutes.sentry.wrapLambdaHandler({
    router,
    logger: log.error,
    sentryDsn: process.env["SENTRY_DSN"]
});
