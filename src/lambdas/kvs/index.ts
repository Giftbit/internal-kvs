import "babel-polyfill";
import * as cassava from "cassava";
import * as giftbitRoutes from "giftbit-cassava-routes";
import * as encryption from "./encryption";
import * as storedItemAccess from "./storedItemAccess";
import {StoredItem} from "./StoredItem";
import {specialKeys} from "./specialKeys";

export const router = new cassava.Router();

router.route(new cassava.routes.LoggingRoute());
router.route(new giftbitRoutes.HealthCheckRoute("/v1/storage/healthCheck"));

const authConfigPromise = giftbitRoutes.secureConfig.fetchFromS3ByEnvVar<any>("SECURE_CONFIG_BUCKET", "SECURE_CONFIG_KEY_JWT");
const roleDefinitionsPromise = giftbitRoutes.secureConfig.fetchFromS3ByEnvVar<any>("SECURE_CONFIG_BUCKET", "SECURE_CONFIG_KEY_ROLE_DEFINITIONS");
router.route(new giftbitRoutes.jwtauth.JwtAuthorizationRoute(authConfigPromise, roleDefinitionsPromise));

const defaultScope = "lightrailV1:portal";

router.route("/v1/storage")
    .method("GET")
    .handler(async evt => {
        const auth: giftbitRoutes.jwtauth.AuthorizationBadge = evt.meta["auth"];
        auth.requireIds("giftbitUserId");
        auth.requireScopes(defaultScope);

        const keys = (await storedItemAccess.listKeys(auth.giftbitUserId))
            .filter(key => !(specialKeys[key] && specialKeys[key].hidden));

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
        auth.requireIds("giftbitUserId");

        const key = evt.pathParameters.key;
        if (specialKeys[key] && specialKeys[key].readScopes) {
            auth.requireScopes(...specialKeys[key].readScopes);
        } else {
            auth.requireScopes(defaultScope);
        }

        let storedItem = await storedItemAccess.getStoredItem(auth.giftbitUserId, key);
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
        auth.requireIds("giftbitUserId");

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
            giftbitUserId: auth.giftbitUserId,
            key,
            value
        };
        if (specialKeys[key] && specialKeys[key].encrypted) {
            storedItem = await encryption.encryptStoredItem(auth, storedItem);
        }
        await storedItemAccess.setStoredItem(storedItem);

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

        const key = evt.pathParameters.key;
        if (specialKeys[key] && specialKeys[key].writeScopes) {
            auth.requireScopes(...specialKeys[key].writeScopes);
        } else {
            auth.requireScopes(defaultScope);
        }

        await storedItemAccess.deleteItem(auth.giftbitUserId, key);

        return {
            body: {
                success: true
            }
        };
    });

//noinspection JSUnusedGlobalSymbols
export const handler = router.getLambdaHandler();
