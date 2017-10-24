import * as aws from "aws-sdk";
import * as giftbitRoutes from "giftbit-cassava-routes";
import {StoredItem} from "./StoredItem";

export const kms = new aws.KMS({
    apiVersion: "2014-11-01",
    credentials: process.env["AWS_REGION"] ? new aws.EnvironmentCredentials("AWS") : new aws.SharedIniFileCredentials({profile: "default"}),
    region: process.env["AWS_REGION"] || "us-west-2"
});

export async function encryptStoredItem(auth: giftbitRoutes.jwtauth.AuthorizationBadge, storedItem: StoredItem): Promise<StoredItem> {
    if (storedItem.encrypted) {
        throw new Error("StoredItem is already encrypted.");
    }

    const encryptRes = await kms.encrypt({
        KeyId: process.env["STORED_ITEM_ENCRYPTION_KEY_ID"],
        Plaintext: JSON.stringify(storedItem.value)
    }).promise();

    if (encryptRes.CiphertextBlob instanceof Buffer) {
        return {
            ...storedItem,
            encrypted: true,
            value: encryptRes.CiphertextBlob.toString("base64")
        };
    }
    throw new Error("Unhandled CiphertextBlob type.");
}

export async function dencryptStoredItem(auth: giftbitRoutes.jwtauth.AuthorizationBadge, storedItem: StoredItem): Promise<StoredItem> {
    if (!storedItem.encrypted) {
        throw new Error("StoredItem is not encrypted.");
    }

    const decryptRes = await kms.decrypt({
        CiphertextBlob: Buffer.from(storedItem.value as string, "base64")
    }).promise();

    return {
        ...storedItem,
        encrypted: false,
        value: JSON.parse(decryptRes.Plaintext as string)
    };
}
