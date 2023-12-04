// SPDX-License-Identifier: GPL-3.0

chrome.action.onClicked.addListener(handleActionOnClicked);

async function handleActionOnClicked() {
    console.log("Extension icon clicked.");

    // Create YouTube subscriptions tab and wait for tab completion.
    let tab = await chrome.tabs.create({
        url: "https://www.youtube.com/feed/subscriptions",
        active: true,
    });
    console.log("Tab created:", tab);

    await new Promise((resolve) => {
        console.log("Waiting for tab created to complete...");
        chrome.tabs.onUpdated.addListener(function handleTabsOnUpdated (tabId, changeInfo) {
            if (tabId !== tab.id) {
                return; // Not the tab we are interested in.
            }
            console.log("Tab status update:", changeInfo);
            if (changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(handleTabsOnUpdated);
                console.log("Tab creation completed.");
                resolve();
            }
        });
    });

    // Inject content script.
    let results = await chrome.scripting.executeScript({
        files: ["js/content.js"],
        injectImmediately: true,
        target: {
            tabId: tab.id,
        },
    });
    if (chrome.runtime.lastError) {
        console.error("Chrome runtime error during content script injection:", chrome.runtime.lastError.message);
    }
    if (!Array.isArray(results)) {
        console.error("Expected a content script injection results array:", results);
        return;
    }
    if (results.length !== 1) {
        console.error("Expected a single content script injection result:", results);
        return;
    }
    console.log("Content script injection result:", results[0]);
}
