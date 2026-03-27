# 🛡️ PhishGuard

**AI-Powered Phishing Email Scanner for Gmail**

PhishGuard is a Chrome extension that analyzes Gmail emails in real-time to detect phishing attempts and protect you from malicious content.

![PhishGuard Banner](https://img.shields.io/badge/Security-Phishing_Protection-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0-green?style=for-the-badge)

## ✨ Features

### 🔍 Advanced Detection
- **Homograph Attack Detection**: Identifies lookalike characters (e.g., Cyrillic 'о' vs Latin 'o')
- **Link Spoofing Detection**: Catches when displayed URLs don't match actual destinations
- **Urgency Tactics Detection**: Flags pressure keywords commonly used in phishing
- **Credential Request Detection**: Warns when emails ask for passwords or sensitive info
- **Domain Analysis**: Identifies suspicious sender domains and public email impersonation

### 📊 Visual Risk Assessment
- **0-100 Safety Score**: Instant visual gauge showing email safety
- **Color-Coded Alerts**: 
  - 🟢 Green (80-100): Safe
  - 🟡 Yellow (50-79): Suspicious
  - 🔴 Red (0-49): Dangerous
- **Detailed Risk Cards**: See exactly what triggered each alert

### 🎨 Modern UI
- Beautiful glassmorphic sidebar design
- Smooth animations and transitions
- Non-intrusive integration with Gmail
- Responsive to all screen sizes

## 🚀 Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Download/Clone** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `PhishGuard` folder
6. **Done!** The extension is now active

### Method 2: Chrome Web Store (Coming Soon)
_Once published, you'll be able to install directly from the Chrome Web Store_

## 📖 Usage

1. **Open Gmail** in Chrome
2. **Click on any email** to view its contents
3. **PhishGuard automatically scans** the email
4. **View the results** in the sidebar that appears on the right
5. **Check the score** and review any risk indicators
6. Click **Re-Scan Email** if needed

## 🛠️ Technical Details

### Detection Methods

#### Homograph Detection
```javascript
// Detects mixed scripts (Latin + Cyrillic)
const hasCyrillic = /[\u0400-\u04FF]/.test(domain);
const hasLatin = /[a-zA-Z]/.test(domain);
```

#### Link Mismatch Detection
```javascript
// Compares displayed text vs actual href
if (displayedDomain !== actualDomain) {
    // Flag as suspicious
}
```

#### Scoring System
- Base score: 100 (Safe)
- Penalties applied for each risk factor:
  - Homograph attack: -60
  - Known suspicious domain: -50
  - Urgency tactics: -15 per keyword (max -40)
  - Link spoofing: -20 per link
  - Credential requests: -25
  - Suspicious links: -10 each (max -30)

### Architecture

```
PhishGuard/
├── manifest.json       # Extension configuration
├── background.js       # Service worker
├── content.js         # Gmail integration & scanning logic
├── ui.js              # Sidebar UI components
├── analysis.js        # Detection algorithms
├── sidebar.css        # Styling
├── popup.html         # Extension popup
└── test_analysis.js   # Test suite
```

## 🧪 Testing

Run the test suite in browser console:

```javascript
// Load the test file in console
// Or just open popup and paste test_analysis.js contents
```

Test cases include:
- ✅ Safe emails
- ⚠️ Homograph attacks
- 🔗 Link mismatch attacks
- 🚨 Multiple red flags
- ⚡ Urgency tactics

## 🔒 Privacy & Security

- **100% Local Processing**: All analysis happens on your device
- **No Data Collection**: We don't collect or store any email data
- **No External API Calls**: Everything runs offline
- **Open Source**: Code is transparent and auditable

## 🐛 Known Limitations

1. **Gmail Selector Dependency**: Gmail may update their DOM structure, breaking selectors
2. **Heuristic-Based**: Not connected to a threat intelligence database (yet)
3. **False Positives**: May flag some legitimate urgent emails
4. **Gmail Only**: Currently only works with Gmail interface

## 🗺️ Roadmap

- [ ] Support for Outlook/Yahoo Mail
- [ ] Machine Learning-based detection
- [ ] Threat intelligence API integration
- [ ] Whitelist/blocklist management
- [ ] Detailed reporting dashboard
- [ ] Email history analysis
- [ ] Browser notifications

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

Built with ❤️ for safer email communications

## 🙏 Acknowledgments

- Gmail for the platform
- Chrome Extensions API
- The security research community

---

**⚠️ Disclaimer**: PhishGuard is a detection tool and should not be your only line of defense. Always verify suspicious emails through multiple channels and never click links or download attachments from untrusted sources.

**Stay Safe Online! 🛡️**
