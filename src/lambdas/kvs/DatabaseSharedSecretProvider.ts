import * as giftbitRoutes from "giftbit-cassava-routes";
import * as jwt from "jsonwebtoken";
import * as storedItemAccess from "./storedItemAccess";
import * as encryption from "./encryption";

export class DatabaseSharedSecretProvider implements giftbitRoutes.jwtauth.sharedSecret.SharedSecretProvider {
    async getSharedSecret(token: string): Promise<string> {
        // The signature of the token does not get verified because it's signed with the secret
        // that we're fetching.
        const unverifiedAuthPayload = (jwt.decode(token) as any);
        if (!unverifiedAuthPayload) {
            throw new Error("Merchant signed token cannot be decoded as a JWT.");
        }
        const unverifiedAuth = new giftbitRoutes.jwtauth.AuthorizationBadge(unverifiedAuthPayload);

        let storedItem = await storedItemAccess.getStoredItem(unverifiedAuth.userId, "jwtSecret");
        if (!storedItem) {
            throw new Error("Merchant does not have a shared secret set.");
        }
        if (storedItem.encrypted) {
            storedItem = await encryption.dencryptStoredItem(unverifiedAuth, storedItem);
        }
        return storedItem.value;
    }
}
