# PhishGuard — Real-Time Phishing Detection Browser Extension

**Type:** Personal Project  
**Languages:** Python, JavaScript, CSS  
**Date:** January 2025 — Present  
**Status:** Active Development  

---

## Project Overview

PhishGuard is a lightweight browser extension for Gmail and Outlook that detects phishing emails in real time without requiring external API calls or server-side processing. It addresses the growing threat of phishing attacks that bypass built-in spam filters by using client-side heuristic analysis.

---

## Problem Statement

Despite major email providers having spam filters, phishing emails continue to reach users' inboxes because:

- Attackers constantly evolve their techniques to bypass ML-based filters
- Cloud-based filters require sending email content to third-party servers — a privacy concern
- Zero-day phishing campaigns are not yet in threat intelligence databases
- Targeted spear-phishing emails look legitimate to generic filters

---

## Solution

PhishGuard analyses emails locally in the browser using a set of heuristic rules that flag common phishing indicators without ever sending data to an external server.

**Indicators checked:**

| Indicator | Description |
|---|---|
| Sender domain mismatch | Display name vs actual sending domain |
| Urgency language | Keywords like "immediate action", "verify now", "account suspended" |
| Suspicious links | URLs that differ from display text, shortened URLs, lookalike domains |
| Attachment types | Executable attachments (.exe, .vbs, .js, .zip with executables) |
| Brand impersonation | Known brand names in email body vs unrelated sending domain |
| Reply-to mismatch | Reply-to address differs from sender address |

---

## Technical Architecture

```
Email loaded in Gmail/Outlook
        ↓
Content Script (JavaScript)
reads DOM — extracts email metadata and body
        ↓
Heuristic Analysis Engine
runs all indicator checks client-side
        ↓
Risk Score calculated (0-100)
        ↓
Warning Banner injected into DOM
if score exceeds threshold
```

---

## Key Technical Decisions

**Why client-side only?**
- Privacy — email content never leaves the browser
- Speed — no network latency for API calls
- Availability — works offline and without account setup

**Why heuristics over ML?**
- ML models require training data and external hosting
- Heuristic rules are transparent and explainable
- Easier to update and maintain
- Lower resource usage for a browser extension

---

## What I Learned

- Browser extension architecture and the Chrome Extension Manifest V3 API
- DOM manipulation and content script injection
- How phishing attacks are constructed technically
- Client-side security analysis without server dependency
- The limitations of signature-based vs behaviour-based detection

---

## Links

- GitHub: Coming Soon
- Demo: Coming Soon
