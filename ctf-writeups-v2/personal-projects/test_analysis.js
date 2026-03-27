/**
 * PhishGuard Test Suite
 * Run this in a browser console to test the analyzer
 */

console.log("=== PhishGuard Test Suite ===");

// Test 1: Safe Email
console.log("\n--- Test 1: Safe Email ---");
const analyzer = new PhishGuardAnalyzer();
const safeEmail = {
    senderEmail: "newsletter@company.com",
    senderName: "Company Newsletter",
    subject: "Monthly Updates",
    body: "Here are this month's updates...",
    links: [{ text: "Read more", href: "https://company.com/blog" }]
};
console.log("Result:", analyzer.analyze(safeEmail));

// Test 2: Homograph Attack
console.log("\n--- Test 2: Homograph Attack ---");
const homographEmail = {
    senderEmail: "admin@gооgle.com", // Uses Cyrillic 'о' instead of Latin 'o'
    senderName: "Google Support",
    subject: "Security Alert",
    body: "Your password needs verification",
    links: []
};
console.log("Result:", analyzer.analyze(homographEmail));

// Test 3: Link Mismatch
console.log("\n--- Test 3: Link Mismatch Attack ---");
const linkMismatchEmail = {
    senderEmail: "support@paypal.com",
    senderName: "PayPal",
    subject: "Confirm your account",
    body: "Please verify your account",
    links: [
        { text: "www.paypal.com", href: "http://phishing-site.com/fake" },
        { text: "Click here", href: "http://192.168.1.1/malware" }
    ]
};
console.log("Result:", analyzer.analyze(linkMismatchEmail));

// Test 4: Multiple Red Flags
console.log("\n--- Test 4: Multiple Red Flags ---");
const dangerousEmail = {
    senderEmail: "support@gmail.com",
    senderName: "Bank Support",
    subject: "URGENT: Your account will be suspended immediately",
    body: "Please enter your password to confirm your identity. Act now! Verify now!",
    links: [
        { text: "Click here", href: "http://evil.com" },
        { text: "www.bank.com", href: "http://192.168.50.1/phish" }
    ]
};
console.log("Result:", analyzer.analyze(dangerousEmail));

// Test 5: Urgency Tactics
console.log("\n--- Test 5: Urgency Tactics ---");
const urgencyEmail = {
    senderEmail: "security@service.com",
    senderName: "Security Team",
    subject: "Action required: Unusual sign-in detected - Account will be locked",
    body: "Your account has unusual activity. Limited time to verify.",
    links: []
};
console.log("Result:", analyzer.analyze(urgencyEmail));

console.log("\n=== Test Suite Complete ===");
