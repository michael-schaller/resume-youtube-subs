// SPDX-License-Identifier: GPL-3.0

chrome.action.onClicked.addListener(handleRuntimeOnClicked);

chrome.runtime.onStartup.addListener(checkUnpackedExtension);
checkUnpackedExtension();


async function handleRuntimeOnClicked() {
    console.log("Extension icon clicked.");

    // Create YouTube subscriptions tab and wait for tab completion.
    var tab = await chrome.tabs.create({
        url: "https://www.youtube.com/feed/subscriptions",
        active: true,
    });
    console.log("Tab created:", tab);

    // The content script can only be injected once the tab loading is done as we might otherwise inject the script into the empty tab document.
    await new Promise((resolve) => {
        console.log("Waiting for tab loading...");
        chrome.tabs.onUpdated.addListener(function handleTabsOnUpdated(tabId, changeInfo) {
            if (tabId !== tab.id) {
                return; // Not the tab we are interested in.
            }
            console.log("Tab status update:", changeInfo);
            if (changeInfo.status !== 'loading') {
                chrome.tabs.onUpdated.removeListener(handleTabsOnUpdated);
                console.log("Tab loaded.");
                resolve();
            }
        });
    });

    // Inject content script.
    // The content script injection needs to happen as early as possible so that the MutationObserver of the content script can catch the earliest video loads.
    var results = await chrome.scripting.executeScript({
        files: ["js/content_script.js"],
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


function checkUnpackedExtension() {
    chrome.management.getSelf(function (extInfo) {
        if (extInfo.installType === "development") {
            console.log("Unpacked development extension.");
            chrome.action.setBadgeText({text: "Dev"});
        }
    });
}
