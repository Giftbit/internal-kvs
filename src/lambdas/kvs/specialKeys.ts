import {SpecialKey} from "./SpecialKey";

export const specialKeys: {[key: string]: SpecialKey} = {
    jwtSecret: {
        encrypted: true,
        hidden: true,
        readScopes: ["lightrailV1:sharedSecret:read"],
        writeScopes: ["lightrailV1:sharedSecret:write"]
    },
    reactionsSecureObject: {
        encrypted: true,
        hidden: true,
        readScopes: ["lightrailV1:react:secure:read"],
        writeScopes: ["lightrailV1:react:secure:write"]
    },
    stripeAuth: {
        encrypted: true,
        hidden: true,
        readScopes: ["lightrailV1:stripeConnect:read"],
        writeScopes: ["lightrailV1:stripeConnect:write"]
    },
    turnkeyPublicConfig: {
        encrypted: false,
        hidden: false,
        readScopes: [],
        writeScopes: ["lightrailV1:portal"]
    }
};
