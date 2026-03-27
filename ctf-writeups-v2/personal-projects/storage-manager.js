/**
 * PhishGuard Storage Manager
 * Handles all local storage operations for statistics and history
 */

class StorageManager {
    constructor() {
        this.STORAGE_KEY_STATS = 'pg_stats';
        this.STORAGE_KEY_HISTORY = 'pg_history';
        this.STORAGE_KEY_SETTINGS = 'pg_settings';
        this.MAX_HISTORY_ITEMS = 50;
    }

    /**
     * Initialize default storage if empty
     */
    async init() {
        const stats = await this.getStats();
        if (!stats) {
            await this.resetStats();
        }
    }

    /**
     * Get current statistics
     * @returns {Promise<Object>}
     */
    getStats() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.STORAGE_KEY_STATS], (result) => {
                resolve(result[this.STORAGE_KEY_STATS] || {
                    totalScanned: 0,
                    threatsDetected: 0,
                    risksFound: {
                        high: 0,
                        medium: 0,
                        low: 0
                    },
                    lastScan: null
                });
            });
        });
    }

    /**
     * Update statistics after a scan
     * @param {Object} scanResult - Result from PhishGuardAnalyzer
     */
    async updateStats(scanResult) {
        const stats = await this.getStats();

        stats.totalScanned++;
        stats.lastScan = Date.now();

        // Increment risks found based on result
        if (scanResult.score < 80) {
            stats.threatsDetected++;
        }

        if (scanResult.risks && scanResult.risks.length > 0) {
            scanResult.risks.forEach(risk => {
                if (stats.risksFound[risk.level] !== undefined) {
                    stats.risksFound[risk.level]++;
                }
            });
        }

        await this.saveStats(stats);
        await this.addToHistory(scanResult);

        return stats;
    }

    /**
     * Save statistics object
     * @param {Object} stats 
     */
    saveStats(stats) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.STORAGE_KEY_STATS]: stats }, resolve);
        });
    }

    /**
     * Reset statistics to zero
     */
    resetStats() {
        const defaultStats = {
            totalScanned: 0,
            threatsDetected: 0,
            risksFound: {
                high: 0,
                medium: 0,
                low: 0
            },
            lastScan: null
        };
        return this.saveStats(defaultStats);
    }

    /**
     * Add a scan result to history
     * @param {Object} scanResult 
     */
    async addToHistory(scanResult) {
        let history = await this.getHistory();

        // Create history item (minimized version of result to save space)
        const item = {
            timestamp: Date.now(),
            score: scanResult.score,
            status: scanResult.status,
            riskCount: scanResult.risks ? scanResult.risks.length : 0,
            sender: scanResult.metadata ? scanResult.metadata.sender : 'Unknown',
            subject: scanResult.metadata ? scanResult.metadata.subject : 'Unknown'
        };

        // Add to beginning of array
        history.unshift(item);

        // Limit size
        if (history.length > this.MAX_HISTORY_ITEMS) {
            history = history.slice(0, this.MAX_HISTORY_ITEMS);
        }

        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.STORAGE_KEY_HISTORY]: history }, resolve);
        });
    }

    /**
     * Get scan history
     */
    getHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.STORAGE_KEY_HISTORY], (result) => {
                resolve(result[this.STORAGE_KEY_HISTORY] || []);
            });
        });
    }

    /**
     * Clear history
     */
    clearHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.STORAGE_KEY_HISTORY]: [] }, resolve);
        });
    }
}

// Export for usage
window.StorageManager = StorageManager;
