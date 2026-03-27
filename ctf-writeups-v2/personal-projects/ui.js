/**
 * PhishGuard UI Builder
 */

class PhishGuardUI {
    constructor() {
        this.root = null;
        this.shadow = null;
    }

    init() {
        if (document.getElementById('phishguard-root')) {
            return; // Already initialized
        }
        // Create host element
        this.root = document.createElement('div');
        this.root.id = 'phishguard-root';
        document.body.appendChild(this.root);

        // Attach Shadow DOM
        this.shadow = this.root.attachShadow({ mode: 'open' });

        // Inject CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('sidebar.css');
        this.shadow.appendChild(link);

        // Build Container
        this.container = document.createElement('div');
        this.container.className = 'pg-container';
        this.shadow.appendChild(this.container);

        this.renderDefault();
    }

    renderDefault() {
        this.container.innerHTML = `
      <div class="pg-header">
        <div class="pg-title">
          <span class="pg-logo">🛡️</span> PhishGuard
        </div>
        <div class="pg-controls">
            <button id="pg-minimize" class="pg-minimize-btn" title="Minimize">─</button>
            <button id="pg-close" class="pg-minimize-btn" title="Close" style="font-size: 16px;">✕</button>
        </div>
      </div>
      <div class="pg-score-container">
        <div class="pg-gauge">
          <div class="pg-gauge-fill" id="pg-gauge-fill" style="transform: rotate(-180deg);"></div>
        </div>
        <div class="pg-score-text" id="pg-score-val">--</div>
        <div class="pg-status" id="pg-status-text">Ready to Scan</div>
      </div>
      <div class="pg-details" id="pg-details-list">
         <div class="pg-card">
           Open an email to see the risk analysis.
         </div>
      </div>
      <button class="pg-button-scan" id="pg-scan-btn">Re-Scan Email</button>
    `;

        // Minimize Button
        this.shadow.getElementById('pg-minimize').addEventListener('click', () => {
            this.minimize();
        });

        // Close Button (Just hides for now, conceptually same as minimize but maybe full hide)
        this.shadow.getElementById('pg-close').addEventListener('click', () => {
            this.root.style.display = 'none';
        });

        // Create bubble element (hidden by default)
        this.bubble = document.createElement('div');
        this.bubble.className = 'pg-bubble pg-hidden';
        this.bubble.innerHTML = '🛡️';
        this.bubble.title = "Expand PhishGuard";
        this.bubble.addEventListener('click', () => this.expand());
        // Auto-expand on hover
        this.bubble.addEventListener('mouseenter', () => this.expand());
        this.shadow.appendChild(this.bubble);
    }

    minimize() {
        this.container.classList.add('pg-hidden');
        this.bubble.classList.remove('pg-hidden');
    }

    expand() {
        this.container.classList.remove('pg-hidden');
        this.bubble.classList.add('pg-hidden');
    }

    update(result, whitelistManager, attemptGmailBlock) {
        // Update Score
        const scoreVal = this.shadow.getElementById('pg-score-val');
        const statusText = this.shadow.getElementById('pg-status-text');
        const gaugeFill = this.shadow.getElementById('pg-gauge-fill');
        const detailsList = this.shadow.getElementById('pg-details-list');

        scoreVal.innerText = result.score;
        statusText.innerText = result.status;

        // Calculate rotation: 0 score = -180deg (red zone), 100 score = 0deg (green zone)
        const rotation = -180 + (result.score / 100 * 180);
        gaugeFill.style.transform = `rotate(${rotation}deg)`;

        // Color logic based on score/status
        let color = '#10b981'; // green
        if (result.score < 50) color = '#ef4444'; // red
        else if (result.score < 80) color = '#f59e0b'; // yellow/orange

        gaugeFill.style.background = color;
        scoreVal.style.color = color;

        // Update Details - categorize by risk level
        detailsList.innerHTML = '';

        // Add Trust/Block Actions
        if (!result.isWhitelisted && !result.isBlocklisted && result.metadata && result.metadata.email) {
            const actionsDiv = document.createElement('div');
            actionsDiv.style.marginBottom = '10px';
            actionsDiv.style.textAlign = 'center';

            const trustBtn = document.createElement('button');
            trustBtn.innerText = "Trust Sender";
            trustBtn.style.cssText = `
                background: #ecfdf5; color: #059669; border: 1px solid #10b981; 
                padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;
                margin-right: 5px;
            `;

            trustBtn.onclick = async () => {
                if (whitelistManager) {
                    await whitelistManager.addToWhitelist(result.metadata.email);
                    // Trigger rescan/update UI manually or reload
                    // Simple refresh:
                    trustBtn.innerText = "Trusted ✓";
                    trustBtn.disabled = true;
                }
            };

            const blockBtn = document.createElement('button');
            blockBtn.innerText = "Block";
            blockBtn.style.cssText = `
                background: #fef2f2; color: #dc2626; border: 1px solid #ef4444; 
                padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;
            `;

            blockBtn.onclick = async () => {
                if (confirm(`Block emails from ${result.metadata.email}?`)) {
                    if (whitelistManager) {
                        await whitelistManager.addToBlocklist(result.metadata.email);
                        blockBtn.innerText = "Blocked 🚫";
                        blockBtn.disabled = true;

                        // Attempt native Gmail block
                        if (attemptGmailBlock) {
                            blockBtn.innerText = "Blocking in Gmail...";
                            const gmailSuccess = await attemptGmailBlock(result.metadata.sender);
                            if (gmailSuccess) {
                                blockBtn.innerText = "Blocked (Gmail+PG) 🚫";
                            } else {
                                blockBtn.innerText = "Blocked (PG Only) 🚫";
                                alert("PhishGuard blocked this sender locally, but could not automate Gmail blocking. Please manually block them in Gmail's 'More options' menu.");
                            }
                        }
                    }
                }
            };

            actionsDiv.appendChild(trustBtn);
            actionsDiv.appendChild(blockBtn);
            detailsList.appendChild(actionsDiv);
        }

        if (result.risks.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.innerHTML = `
            <div class="pg-card risk-low" style="border-left-color: #10b981;">
                <div class="pg-card-title">✓ All Good!</div>
                <div>No suspicious indicators found in this email.</div>
            </div>
            `;
            detailsList.appendChild(emptyState);
        } else {
            // Sort by level: high first, then medium, then low
            const sortedRisks = [...result.risks].sort((a, b) => {
                const levels = { high: 0, medium: 1, low: 2 };
                return levels[a.level] - levels[b.level];
            });

            sortedRisks.forEach(risk => {
                const riskClass = risk.level === 'high' ? 'risk-high' : risk.level === 'medium' ? 'risk-medium' : 'risk-low';
                const icon = risk.level === 'high' ? '⚠️' : risk.level === 'medium' ? '⚡' : 'ℹ️';

                const card = document.createElement('div');
                card.className = `pg-card ${riskClass}`;
                card.innerHTML = `
                    <div class="pg-card-title">
                        ${icon} ${risk.title}
                    </div>
                    <div>${risk.desc}</div>
                `;
                detailsList.appendChild(card);
            });
        }
    }
}

window.PhishGuardUI = PhishGuardUI;
