var rule1 = {
    conditions: [
        new chrome.declarativeContent.PageStateMatcher({
            // If I wanted my extension to work only on SO I would put
            // hostContains: 'stackoverflow.com'
            // You can check out the link above for more options for the rules
            pageUrl: { hostContains: 'calendar.google.com' }
        })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
};

chrome.runtime.onInstalled.addListener(function (details) {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([rule1])
    })
})