export interface StoredItem {
    encrypted?: boolean;

    /**
     * This is a legacy name.  We would call this `accountId` these days.
     * It's not exposed publicly and not worth the migration.
     */
    giftbitUserId: string;
    key: string;
    value: any;
}
