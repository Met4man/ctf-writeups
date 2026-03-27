// PhishGuard Service Worker
console.log("PhishGuard background service worker loaded.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("PhishGuard installed.");
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png', // We need to make sure we have an icon, or use a default one if available
      title: request.title,
      message: request.message,
      priority: 2
    });
  }
});
