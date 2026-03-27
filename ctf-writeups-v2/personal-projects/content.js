/**
 * PhishGuard Content Script
 */

console.log("PhishGuard content script loading...");

// Wait for the window to load completely
window.addEventListener('load', () => {
    initPhishGuard();
});

function initPhishGuard() {
    // Check if already injected
    if (document.getElementById('phishguard-root')) {
        console.log("PhishGuard already initialized.");
        return;
    }

    const ui = new PhishGuardUI();
    ui.init();

    const analyzer = new PhishGuardAnalyzer();

    const storage = new StorageManager();
    const whitelistManager = new WhitelistManager();

    storage.init();
    whitelistManager.init();

    let lastUrl = location.href;

    // Polling is often more reliable than only hashchange for SPA like Gmail
    setInterval(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log("PhishGuard: URL changed, attempting scan...");
            // URL changed, wait a bit for DOM to render then scan
            setTimeout(() => runScan(ui, analyzer, storage, whitelistManager), 1000);
        }

        // Also check if we are viewing an email but haven't scanned (naive check)
        // For MVP, we'll just allow the user to click "Re-Scan" or rely on URL changes.
        // Or we can observe the main container.
    }, 1000);

    // Initial scan attempt
    setTimeout(() => runScan(ui, analyzer, storage, whitelistManager), 2000);

    // Wire up Re-Scan button
    // Since the button is in Shadow DOM, the event listener is set in UI class, 
    // but the actual logic needs to trigger here. 
    // We can expose a method on UI or just repoll.
    // Let's modify UI class in next step if needed, or just re-attach listener here if we could access it.
    // Easier: Pass a callback to UI.init() or handle it here via internal helper if `ui.shadow` is accessible.

    const scanBtn = ui.shadow.getElementById('pg-scan-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            runScan(ui, analyzer, storage, whitelistManager);
        });
    }
}

async function runScan(ui, analyzer, storage, whitelistManager) {
    console.log("PhishGuard: Scanning email...");

    // Gmail Selectors (updated for modern Gmail 2024/2025)
    // These selectors may need adjustment based on Gmail updates
    // Subject: h2.hP or h2[data-thread-perm-id] 
    // Sender: .gD (displays name), email attribute or span.go
    // Body: .a3s or div[data-message-id] .a3s

    const subjectEl = document.querySelector('h2.hP') || document.querySelector('h2[data-legacy-thread-id]');
    const senderEl = document.querySelector('.gD');
    const bodyEl = document.querySelector('.a3s.aiL'); // aiL = actual body content

    if (!subjectEl || !bodyEl) {
        console.log("PhishGuard: No email content detected. User may be in inbox view.");
        ui.root.style.display = 'none'; // Hide when not viewing an email
        return;
    }

    // Extract sender email (Gmail stores it in 'email' attribute)
    let senderEmail = "";
    if (senderEl) {
        senderEmail = senderEl.getAttribute('email') || "";
        // If not in attribute, try to extract from hover/title
        if (!senderEmail) {
            const emailMatch = senderEl.getAttribute('title')?.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch) senderEmail = emailMatch[0];
        }
    }

    const emailData = {
        subject: subjectEl.innerText.trim(),
        senderName: senderEl ? senderEl.innerText.trim() : "Unknown",
        senderEmail: senderEmail,
        body: bodyEl.innerText.trim(),
        links: Array.from(bodyEl.querySelectorAll('a')).map(a => ({
            text: a.innerText.trim(),
            href: a.href
        })),
        attachments: Array.from(document.querySelectorAll('.aQa')).map(el => el.innerText.trim())
    };

    console.log("PhishGuard Scraped Data:", emailData);

    const emailDomain = emailData.senderEmail ? emailData.senderEmail.split('@')[1] : '';

    // Check Whitelist/Blocklist
    let result;
    const isWhitelisted = await whitelistManager.isWhitelisted(emailData.senderEmail, emailDomain);
    const isBlocklisted = await whitelistManager.isBlocklisted(emailData.senderEmail, emailDomain);

    if (isWhitelisted) {
        result = {
            score: 100,
            status: 'Trusted Sender',
            risks: [],
            isWhitelisted: true
        };
    } else if (isBlocklisted) {
        result = {
            score: 0,
            status: 'Blocklisted',
            risks: [{
                title: 'Sender Blocklisted',
                level: 'high',
                desc: 'You have manually added this sender to your blocklist.'
            }],
            isBlocklisted: true
        };
    } else {
        // Analyze the email
        result = analyzer.analyze(emailData);
    }

    console.log("PhishGuard Analysis Result:", result);

    // Add metadata for history tracking and whitelist actions
    result.metadata = {
        sender: emailData.senderEmail || emailData.senderName,
        subject: emailData.subject,
        email: emailData.senderEmail,
        domain: emailDomain
    };

    // Update statistics
    if (storage) {
        storage.updateStats(result);
    }

    // Trigger Notification if Dangerous
    if (result.score < 50 && !result.isBlocklisted) {
        chrome.runtime.sendMessage({
            action: 'SHOW_NOTIFICATION',
            title: '⚠️ Dangerous Email Detected',
            message: `PhishGuard detected high risks in this email from ${result.metadata.sender}. Proceed with caution.`
        });
    }

    // Update UI
    ui.update(result, whitelistManager, attemptGmailBlock);
    ui.root.style.display = 'block'; // Ensure visible when results are ready
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'TOGGLE_UI') {
        const root = document.getElementById('phishguard-root');
        if (root) {
            // accessible via closed-over variable 'ui' if we were inside init, 
            // but we are outside. We need a way to access the UI instance.
            // Simplified: toggle data-attribute or just display property, 
            // but ideally we call ui.expand().
            // Since we can't easily reach the specific instance from here without global,
            // let's assume we can just modify the style or dispatch an event.
            if (root.style.display === 'none') {
                root.style.display = 'block';
            }
            // Also ensure it's expanded
            const container = root.shadowRoot.querySelector('.pg-container');
            const bubble = root.shadowRoot.querySelector('.pg-bubble');
            if (container && container.classList.contains('pg-hidden')) {
                container.classList.remove('pg-hidden');
                bubble.classList.add('pg-hidden');
            }
        }
    }
});

async function attemptGmailBlock(senderName) {
    console.log(`PhishGuard: Attempting to block ${senderName} in Gmail...`);

    // Helper to wait for an element
    const waitFor = (selector, timeout = 2000) => {
        return new Promise(resolve => {
            if (typeof selector === 'function') {
                if (selector()) return resolve(selector());
            } else if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(() => {
                const el = typeof selector === 'function' ? selector() : document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    };

    // 1. Find the "More options" button
    // It is usually an icon button with aria-label="More options" or title="MoreOptions"
    // We target the one inside the email header (often near the date/reply button)
    const findMoreBtn = () => {
        const candidates = Array.from(document.querySelectorAll('div[aria-label="More options"], div[title="More options"]'));
        // Find the one that is visible and likely in the email header (not the main toolbar)
        // heuristic: offsetParent is not null (visible) and contained in a header-like structure
        return candidates.find(btn => btn.offsetParent !== null && btn.closest('.Kv, .gE, .Tv'));
    };

    const moreBtn = await waitFor(findMoreBtn, 1500);

    if (!moreBtn) {
        console.log("PhishGuard: 'More options' button not found.");
        return false;
    }

    moreBtn.click();

    // 2. Wait for the "Block <Sender>" menu item
    const findBlockItem = () => {
        const menuItems = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="option"]'));
        return menuItems.find(item => {
            const text = item.innerText || "";
            // Match "Block" and part of the sender name
            // Robustness: Just "Block" might match "Unblock", so check for "Block " specifically or ensure it doesn't start with "Un"
            return text.includes("Block") && !text.includes("Unblock") &&
                (text.includes(senderName) || text.includes(senderName.split(' ')[0]) || text.includes("@"));
        });
    };

    const blockItem = await waitFor(findBlockItem, 1500);

    if (!blockItem) {
        console.log("PhishGuard: 'Block' menu item not found. Menu might not have opened or text mismatch.");
        return false;
    }

    blockItem.click();
    console.log("PhishGuard: Clicked 'Block' menu item.");

    // 3. Handle Confirmation Confirmation Dialog (if it appears)
    // Sometimes Gmail asks "Block this email address?"
    const findConfirmBtn = () => {
        // Buttons usually have name="ok" or are in a modal dialog
        const buttons = Array.from(document.querySelectorAll('button[name="ok"], div[role="button"].T-I-J3'));
        // Find one that says "Block"
        return buttons.find(b => b.innerText === "Block" && b.offsetParent !== null);
    };

    const confirmBtn = await waitFor(findConfirmBtn, 1500);
    if (confirmBtn) {
        confirmBtn.click();
        console.log("PhishGuard: Clicked confirmation 'Block'.");
    }

    return true;
}
