import "babel-polyfill";
import * as cassava from "cassava";
import * as giftbitRoutes from "giftbit-cassava-routes";
import {httpStatusCode, RestError} from "cassava";
import * as storedItemAccess from "./storedItemAccess";

export const router = new cassava.Router();

router.route(new cassava.routes.LoggingRoute());

const secureConfigBucket = process.env["SECURE_CONFIG_BUCKET"] || console.error("Env SECURE_CONFIG_BUCKET is required to run this lambda");
const secureConfigAuthBadgeKey = process.env["SECURE_CONFIG_KEY_JWT"] || console.error("Env SECURE_CONFIG_KEY_JWT is required to run this lambda");
const authBadgeKeyPromise = giftbitRoutes.secureConfig.fetchFromS3<giftbitRoutes.secureConfig.AuthenticationConfig>(secureConfigBucket as string, secureConfigAuthBadgeKey as string);
router.route(new giftbitRoutes.jwtauth.JwtAuthorizationRoute(authBadgeKeyPromise));

router.route("/v1/storage")
    .method("GET")
    .handler(async evt => {
        const auth: giftbitRoutes.jwtauth.AuthorizationBadge = evt.meta["auth"];
        auth.requireIds("giftbitUserId");

        const keys = await storedItemAccess.listKeys(auth.giftbitUserId);

        return {
            body: {
                keys: keys
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
        auth.requireIds("giftbitUserId");

        const storedItem = await storedItemAccess.getStoredItem(auth.giftbitUserId, evt.pathParameters.key);
        if (storedItem == null) {
            throw new RestError(httpStatusCode.clientError.NOT_FOUND, "Resource not found.  The resource type was understood but nothing lives there.");
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
        auth.requireIds("giftbitUserId");

        if (JSON.stringify(evt.body).length > 10 * 1024) {
            throw new RestError(httpStatusCode.clientError.PAYLOAD_TOO_LARGE, "Payload too large.  The max value size is 10 KiB.");
        }

        await storedItemAccess.setStoredItem({
            giftbitUserId: auth.giftbitUserId,
            key: evt.pathParameters.key,
            value: evt.body
        });

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
        auth.requireIds("giftbitUserId");

        await storedItemAccess.deleteItem(auth.giftbitUserId, evt.pathParameters.key);

        return {
            body: {
                success: true
            }
        };
    });

//noinspection JSUnusedGlobalSymbols
export const handler = router.getLambdaHandler();
