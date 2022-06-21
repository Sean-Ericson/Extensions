// background.js

var enableActionRule = {
    conditions: [
        new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostContains: 'calendar.google.com' }
        })
    ],
    actions: [new chrome.declarativeContent.SetIcon()]
};

// OnInstalled fires when the extension is first installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([enableActionRule]);
    });
});

// OnStartup fires when a profile that has this extension installed first starts up
chrome.runtime.onStartup.addListener(() => {
    
});

// Listen for messages!
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    
})