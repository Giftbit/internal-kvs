import {SpecialKey} from "./SpecialKey";

export const specialKeys: {[key: string]: SpecialKey} = {
    jwtSecret: {
        encrypted: true,
        readScopes: ["lightrailV1:sharedSecret:read"],
        writeScopes: ["lightrailV1:sharedSecret:write"]
    },
    stripeApiKey: {
        encrypted: true,
        readScopes: ["lightrailV1:stripeConnect:read"],
        writeScopes: ["lightrailV1:stripeConnect:write"]
    },
    stripeOauth: {
        encrypted: true,
        readScopes: ["lightrailV1:stripeConnect:read"],
        writeScopes: ["lightrailV1:stripeConnect:write"]
    }
};
