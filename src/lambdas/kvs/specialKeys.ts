import {SpecialKey} from "./SpecialKey";

export const specialKeys: {[key: string]: SpecialKey} = {
    jwtSecret: {
        encrypted: true
    },
    stripeApiKey: {
        encrypted: true
    },
    stripeOauth: {
        encrypted: true
    }
};
