import * as giftbitRoutes from "giftbit-cassava-routes";
import * as jwt from "jsonwebtoken";
import * as storedItemAccess from "./storedItemAccess";
import * as encryption from "./encryption";

export class DatabaseSharedSecretProvider implements giftbitRoutes.jwtauth.sharedSecret.SharedSecretProvider {
    async getSharedSecret(token: string): Promise<string> {
        const authPayload = (jwt.decode(token) as any);
        if (!authPayload) {
            throw new Error("Merchant signed token cannot be decoded as a JWT.");
        }
        const auth = new giftbitRoutes.jwtauth.AuthorizationBadge(authPayload);

        let storedItem = await storedItemAccess.getStoredItem(auth.userId, "jwtSecret");
        if (!storedItem) {
            throw new Error("Merchant does not have a shared secret set.");
        }
        if (storedItem.encrypted) {
            storedItem = await encryption.dencryptStoredItem(auth, storedItem);
        }
        return storedItem.value;
    }
}
