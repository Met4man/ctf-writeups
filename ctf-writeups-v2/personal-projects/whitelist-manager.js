/**
 * PhishGuard Whitelist/Blocklist Manager
 */

class WhitelistManager {
    constructor() {
        this.STORAGE_KEY_WHITELIST = 'pg_whitelist';
        this.STORAGE_KEY_BLOCKLIST = 'pg_blocklist';
    }

    /**
     * Initialize keys if empty
     */
    async init() {
        const whitelist = await this.getlist(this.STORAGE_KEY_WHITELIST);
        if (!whitelist) {
            await this.saveList(this.STORAGE_KEY_WHITELIST, []);
        }

        const blocklist = await this.getlist(this.STORAGE_KEY_BLOCKLIST);
        if (!blocklist) {
            await this.saveList(this.STORAGE_KEY_BLOCKLIST, []);
        }
    }

    /**
     * Get a list by key
     */
    getlist(key) {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] || []);
            });
        });
    }

    saveList(key, list) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: list }, resolve);
        });
    }

    async getWhitelist() {
        return this.getlist(this.STORAGE_KEY_WHITELIST);
    }

    async getBlocklist() {
        return this.getlist(this.STORAGE_KEY_BLOCKLIST);
    }

    /**
     * Add item to whitelist
     * @param {string} item - Domain or Email
     */
    async addToWhitelist(item) {
        item = item.toLowerCase().trim();
        const list = await this.getWhitelist();
        if (!list.includes(item)) {
            list.push(item);
            await this.saveList(this.STORAGE_KEY_WHITELIST, list);
        }
    }

    async removeFromWhitelist(item) {
        item = item.toLowerCase().trim();
        let list = await this.getWhitelist();
        list = list.filter(i => i !== item);
        await this.saveList(this.STORAGE_KEY_WHITELIST, list);
    }

    async addToBlocklist(item) {
        item = item.toLowerCase().trim();
        const list = await this.getBlocklist();
        if (!list.includes(item)) {
            list.push(item);
            await this.saveList(this.STORAGE_KEY_BLOCKLIST, list);
        }
    }

    async removeFromBlocklist(item) {
        item = item.toLowerCase().trim();
        let list = await this.getBlocklist();
        list = list.filter(i => i !== item);
        await this.saveList(this.STORAGE_KEY_BLOCKLIST, list);
    }

    /**
     * Check if item is whitelisted
     */
    async isWhitelisted(email, domain) {
        const list = await this.getWhitelist();
        return list.includes(email.toLowerCase()) || list.includes(domain.toLowerCase());
    }

    /**
     * Check if item is blocklisted
     */
    async isBlocklisted(email, domain) {
        const list = await this.getBlocklist();
        return list.includes(email.toLowerCase()) || list.includes(domain.toLowerCase());
    }
}

window.WhitelistManager = WhitelistManager;
