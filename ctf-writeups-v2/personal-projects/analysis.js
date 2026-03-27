/**
 * PhishGuard Analysis Engine (Mock/Heuristic)
 */

class PhishGuardAnalyzer {
    constructor() {
        this.urgentKeywords = [
            'urgent', 'immediately', 'suspended', 'verify your account',
            'action required', 'unauthorized', 'expire', 'lock',
            'password expiry', 'unusual sign-in', 'confirm your identity',
            'your account will be closed', 'update your information',
            'security alert', 'unusual activity', 'click here', 'verify now',
            'limited time', 'act now', 'confirm now', 'suspended account',
            'final notice', 'close your account', 'unusual login', 'deactivation',
            'validation required', 'account limitation', 'secure your account'
        ];
        this.suspiciousDomains = [
            'gmai1.com', 'paypa1.com', 'verify-bank.com', 'account-update-secure.com',
            'secure-login.com', 'account-verify.com', 'secure-update.com',
            'supp0rt.com', 'secur1ty.com', 'googl.com', 'yah00.com',
            'micr0soft.com', 'amaz0n.com', 'app1e.com'
        ];
        // Common homograph characters (Cyrillic that look like Latin)
        this.homographMap = {
            'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x',
            'у': 'y', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'һ': 'h'
        };
        this.dangerousExtensions = ['.exe', '.scr', '.vbs', '.bat', '.cmd', '.msi', '.jar', '.js', '.iso'];
        this.shortenerDomains = ['bit.ly', 'goo.gl', 'tinyurl.com', 't.co', 'is.gd', 'buff.ly', 'ow.ly', 'tr.im'];
    }

    /**
     * Detect homograph/IDN attacks (mixed scripts or lookalike characters)
     */
    isHomograph(str) {
        if (!str) return false;

        // Check for mixed scripts (e.g., Latin + Cyrillic)
        const hasCyrillic = /[\u0400-\u04FF]/.test(str);
        const hasLatin = /[a-zA-Z]/.test(str);

        if (hasCyrillic && hasLatin) {
            return true;
        }

        // Check for known confusable characters
        for (let char of Object.keys(this.homographMap)) {
            if (str.includes(char)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if link text doesn't match href (potential spoofing)
     */
    checkLinkMismatch(link) {
        if (!link.text || !link.href) return false;

        // Check if text looks like a URL
        const urlPattern = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/;
        if (!urlPattern.test(link.text)) {
            return false; // Text is not a URL, so mismatch check doesn't apply
        }

        // Extract domain from text
        let textDomain = link.text.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

        // Extract domain from href
        try {
            const url = new URL(link.href);
            let hrefDomain = url.hostname.replace(/^www\./, '');

            // Compare domains
            if (textDomain !== hrefDomain) {
                return true; // Mismatch detected
            }
        } catch (e) {
            // Invalid URL
            return true;
        }

        return false;
    }

    analyze(emailData) {
        const { senderName, senderEmail, subject, body, links, attachments } = emailData;
        let score = 100; // Start with perfect score (Safe)
        let risks = [];

        // 1. Sender Analysis
        if (senderEmail) {
            const emailDomain = senderEmail.split('@')[1];

            // Check for homograph attacks in domain
            if (this.isHomograph(emailDomain)) {
                score -= 60;
                risks.push({
                    title: 'Homograph Attack Detected',
                    level: 'high',
                    desc: `The sender domain "${emailDomain}" contains lookalike characters that may be impersonating a legitimate domain.`
                });
            }

            if (this.suspiciousDomains.some(d => emailDomain.includes(d))) {
                score -= 50;
                risks.push({
                    title: 'Suspicious Sender Domain',
                    level: 'high',
                    desc: `The domain "${emailDomain}" matches known spoofing patterns.`
                });
            }

            // Check for official support from public domains
            if (senderName.toLowerCase().includes('support') &&
                (emailDomain.includes('gmail') || emailDomain.includes('yahoo') || emailDomain.includes('hotmail'))) {
                score -= 30;
                risks.push({
                    title: 'Sender Mismatch',
                    level: 'medium',
                    desc: 'Official support teams rarely use free email services like Gmail or Yahoo.'
                });
            }
        }

        // 2. Subject Line Analysis
        const urgentMatches = this.urgentKeywords.filter(kw => subject.toLowerCase().includes(kw));
        if (urgentMatches.length > 0) {
            const penalty = Math.min(40, urgentMatches.length * 15);
            score -= penalty;
            risks.push({
                title: 'Urgency Tactics Detected',
                level: urgentMatches.length > 2 ? 'high' : 'medium',
                desc: `Subject contains ${urgentMatches.length} urgent/pressure keywords commonly used in phishing: "${urgentMatches.join('", "')}"`
            });
        }

        // 3. Link Analysis
        let suspiciousLinkCount = 0;
        let mismatchedLinks = [];

        links.forEach(link => {
            // Check for insecure HTTP
            if (link.href.startsWith('http://') && !link.href.includes('localhost')) {
                suspiciousLinkCount++;
            }

            // Check for generic "click here" text
            if (link.text.toLowerCase() === 'click here' || link.text.toLowerCase() === 'click now') {
                suspiciousLinkCount++;
            }

            // Check for link text/href mismatch
            if (this.checkLinkMismatch(link)) {
                mismatchedLinks.push(link);
            }

            // Check for IP addresses in URLs
            if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(link.href)) {
                suspiciousLinkCount++;
            }
        });

        if (suspiciousLinkCount > 0) {
            const penalty = Math.min(30, 10 * suspiciousLinkCount);
            score -= penalty;
            risks.push({
                title: 'Suspicious Links Detected',
                level: suspiciousLinkCount > 2 ? 'high' : 'medium',
                desc: `Found ${suspiciousLinkCount} suspicious indicators: insecure HTTP, generic link text, or IP addresses.`
            });
        }

        if (mismatchedLinks.length > 0) {
            score -= (20 * mismatchedLinks.length);
            const examples = mismatchedLinks.slice(0, 2).map(l => `"${l.text}" → ${l.href}`).join(', ');
            risks.push({
                title: 'Link Spoofing Detected',
                level: 'high',
                desc: `${mismatchedLinks.length} link(s) display a different URL than their actual destination. Examples: ${examples}`
            });
        }

        // 5. Attachment Analysis
        if (attachments && attachments.length > 0) {
            attachments.forEach(filename => {
                const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
                if (this.dangerousExtensions.includes(ext)) {
                    score -= 40;
                    risks.push({
                        title: 'Dangerous Attachment',
                        level: 'high',
                        desc: `Contains attachment "${filename}" which is an executable or script key.`
                    });
                }
            });
        }

        // 6. URL Shortener Analysis
        links.forEach(link => {
            try {
                const url = new URL(link.href);
                if (this.shortenerDomains.includes(url.hostname.replace('www.', ''))) {
                    score -= 15;
                    risks.push({
                        title: 'Hidden Destination',
                        level: 'medium',
                        desc: `Link "${link.text}" uses a URL shortener (${url.hostname}) to hide its true destination.`
                    });
                }
            } catch (e) { }
        });

        // 4. Body Content Analysis
        const bodyLower = body.toLowerCase();

        // Check for password/credential requests
        if (bodyLower.includes('password') && (bodyLower.includes('enter') || bodyLower.includes('confirm') || bodyLower.includes('verify'))) {
            score -= 25;
            risks.push({
                title: 'Credential Request Detected',
                level: 'high',
                desc: 'Email asks you to enter or confirm your password, which legitimate services rarely do via email.'
            });
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        // Determine status
        let status = 'Safe';
        if (score < 50) status = 'Dangerous';
        else if (score < 80) status = 'Suspicious';

        return { score, status, risks };
    }
}

// Export for module usage if needed, or just attach to window for simple content script usage
window.PhishGuardAnalyzer = PhishGuardAnalyzer;
