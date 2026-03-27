/**
 * PhishGuard Options Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const whitelistManager = new WhitelistManager();
    await whitelistManager.init();

    // DOM Elements
    const whitelistInput = document.getElementById('whitelist-input');
    const whitelistAddBtn = document.getElementById('whitelist-add-btn');
    const whitelistItems = document.getElementById('whitelist-items');

    const blocklistInput = document.getElementById('blocklist-input');
    const blocklistAddBtn = document.getElementById('blocklist-add-btn');
    const blocklistItems = document.getElementById('blocklist-items');

    // Render Lists
    async function renderLists() {
        const whitelist = await whitelistManager.getWhitelist();
        const blocklist = await whitelistManager.getBlocklist();

        renderList(whitelistItems, whitelist, async (item) => {
            await whitelistManager.removeFromWhitelist(item);
            renderLists();
        });

        renderList(blocklistItems, blocklist, async (item) => {
            await whitelistManager.removeFromBlocklist(item);
            renderLists();
        });
    }

    function renderList(container, list, removeCallback) {
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">No items in this list</div>';
            return;
        }

        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <span>${escapeHtml(item)}</span>
                <button class="btn btn-danger">Remove</button>
            `;
            div.querySelector('button').onclick = () => removeCallback(item);
            container.appendChild(div);
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Event Listeners
    whitelistAddBtn.onclick = async () => {
        const val = whitelistInput.value.trim();
        if (val) {
            await whitelistManager.addToWhitelist(val);
            whitelistInput.value = '';
            renderLists();
        }
    };

    blocklistAddBtn.onclick = async () => {
        const val = blocklistInput.value.trim();
        if (val) {
            await whitelistManager.addToBlocklist(val);
            blocklistInput.value = '';
            renderLists();
        }
    };

    // Initial Render
    renderLists();
});
