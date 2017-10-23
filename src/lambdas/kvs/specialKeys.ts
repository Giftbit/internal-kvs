import {SpecialKey} from "./SpecialKey";

export const specialKeys: {[key: string]: SpecialKey} = {
    jwtSecret: {
        encrypted: true,
        readScopes: ["lightrailV1:token:read"],
        writeScopes: ["lightrailV1:token"]
    },
    stripeApiKey: {
        encrypted: true,
        readScopes: ["lightrailV1:stripeConnect:read"],
        writeScopes: ["lightrailV1:stripeConnect"]
    },
    stripeOauth: {
        encrypted: true,
        readScopes: ["lightrailV1:stripeConnect:read"],
        writeScopes: ["lightrailV1:stripeConnect"]
    }
};
