/**
 * PhishGuard Popup Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize storage manager
    // Initialize storage manager
    if (typeof StorageManager === 'undefined') {
        console.error("PhishGuard: StorageManager not loaded");
        return;
    }

    // Check if StorageManager is defined
    if (typeof StorageManager === 'undefined') {
        console.error("StorageManager not loaded");
        return;
    }

    const storage = new StorageManager();

    // UI Elements
    const totalScannedEl = document.getElementById('total-scanned');
    const threatsDetectedEl = document.getElementById('threats-detected');
    const historyListEl = document.getElementById('history-list');
    const clearStatsBtn = document.getElementById('clear-stats-btn');
    const toggleOverlayBtn = document.getElementById('toggle-overlay-btn');

    // Load and display stats
    async function refreshStats() {
        const stats = await storage.getStats();
        const history = await storage.getHistory();

        // Update counters
        if (totalScannedEl) totalScannedEl.textContent = stats.totalScanned;
        if (threatsDetectedEl) threatsDetectedEl.textContent = stats.threatsDetected;

        // Render history
        if (historyListEl) {
            historyListEl.innerHTML = '';

            if (history.length === 0) {
                historyListEl.innerHTML = '<div class="empty-history">No scan history yet</div>';
            } else {
                history.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'history-item';

                    const date = new Date(item.timestamp).toLocaleDateString();
                    const statusColor = item.score >= 80 ? '#10b981' : (item.score < 50 ? '#ef4444' : '#f59e0b');

                    itemEl.innerHTML = `
                        <div class="history-status" style="background-color: ${statusColor}"></div>
                        <div class="history-info">
                            <div class="history-subject">${escapeHtml(item.subject)}</div>
                            <div class="history-meta">${escapeHtml(item.sender)} • ${date}</div>
                        </div>
                        <div class="history-score" style="color: ${statusColor}">${item.score}</div>
                    `;

                    historyListEl.appendChild(itemEl);
                });
            }
        }
    }

    // Helper to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Event Listeners
    if (clearStatsBtn) {
        clearStatsBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear all statistics and history?')) {
                await storage.resetStats();
                await storage.clearHistory();
                refreshStats();
            }
        });
    }

    if (toggleOverlayBtn) {
        toggleOverlayBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_UI' });
                    // Optional: Close popup or show feedback
                    window.close();
                }
            });
        });
    }

    // Initial load
    refreshStats();
});
