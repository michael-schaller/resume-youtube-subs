// SPDX-License-Identifier: GPL-3.0

// Log Resume YouTube Subs extension version.
var manifest = chrome.runtime.getManifest();
if (!manifest) {
    console.error("Chrome runtime did not provide an extension manifest.");
} else {
    if (!("version" in manifest)) {
        console.error("The extension manifest did not provide a version.");
    } else {
        console.info("Resume YouTube Subs extension version: ", manifest.version);
    }
}

// Watch for mutations on the YouTube subscriptions page that is currently loading.
// To avoid brittleness caused by changes on the YouTube side we watch all node changes under the document node and not some deeper YouTube-specific node.
var target = document.documentElement;
var config = {
	subtree: true,
	childList: true,
};
var observer = new MutationObserver(onNodeMutations);
observer.observe(target, config);
console.log("Setup MutationObserver.")

var foundWatchedVideo = false;
var earlyVideoCount = 0;
var lateVideoCount = 0;
var lastVideoCountChange;

function onNodeMutations(mutations) {
    for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (!("addedNodes" in mutation)) {
            continue; // No added nodes -> Nothing to do.
        }
        for (var j = 0; j < mutation.addedNodes.length; j++) {
            var addedNode = mutation.addedNodes[j];

            // IMPORTANT: Everything below here depends on YouTube and can break if there are changes on the YouTube side.

            // Check node prerequisites.
            if (!("localName" in addedNode)) {
                continue;
            }
            if (!addedNode.localName.startsWith("ytd-")) {
                continue; // Not a YouTube node.
            }
            if (!("classList" in addedNode)) {
                continue;
            }

            // IMPORTANT: The various nodes of YouTube videos load with different priorities. For example the video thumbnail
            // loads in early (high priority) and the progress bar in later (lower priority).
            // Sadly this means that if this extension triggers the load of new videos (scrollToEndOfPage) too aggressively
            // that the load of lower priority nodes can be starved and hence it can take a lot longer (or sometimes
            // indefinitely) until the progress bar nodes are loaded and a watched video is found. To avoid this we trigger
            // the load of new videos only if enough videos have mostly loaded (rubber band to ensure that earlyVideoCount
            // isn't too far ahead of lateVideoCount).
            // Furthermore scrollToEndOfPage is throttled via throttledScrollToEndOfPage so the trigger to load new videos
            // happens less frequently and hence less aggressively.
            const rubberBandMin = 10;
            const rubberBandMax = 50;

            switch(true) {
                case isEarlyVideoNode(addedNode):
                    earlyVideoCount++;
                    lastVideoCountChange = Date.now();
                    if (earlyVideoCount == 1) {
                        console.log("Found first video (early).");
                    }
                    if (earlyVideoCount % 10 == 0) {
                        console.log("Video count (early): ", earlyVideoCount);
                    }
                    if (!foundWatchedVideo) {
                        // Trigger load of new videos, unless there are too many videos still loading.
                        if (earlyVideoCount - lateVideoCount <= rubberBandMax) {
                            throttledScrollToEndOfPage();
                        }

                        updateAnimation();
                    }
                    break;

                case isLateVideoNode(addedNode):
                    lateVideoCount++;
                    lastVideoCountChange = Date.now();
                    if (lateVideoCount == 1) {
                        console.log("Found first video (late).");
                    }
                    if (lateVideoCount % 10 == 0) {
                        console.log("Video count (late): ", lateVideoCount);
                    }
                    if (!foundWatchedVideo) {
                        // Trigger load of new videos if most of the videos have loaded.
                        if (earlyVideoCount - lateVideoCount <= rubberBandMin) {
                            throttledScrollToEndOfPage();
                        }

                        updateAnimation();
                    }
                    break;

                case isWatchedVideoNode(addedNode):
                    if(!foundWatchedVideo) {
                        // We found a watched video and hence we no longer need to process any other video nodes.
                        foundWatchedVideo = true;
                        console.log("Found first watched video.");

                        // Schedule disconnect of MutationObserver and only process the remaining mutations.
                        // The delay is needed as not all progress bars of watched videos might be loaded yet
                        // and the progress bar of the first watched video might be delayed.
                        // Once all mutations are handled the extension's job is done.
                        console.log("Scheduling disconnect of MutationObserver. Current early/late video count: ", earlyVideoCount, "/", lateVideoCount);
                        setTimeout(disconnectMutationObserver, 15000);

                        removeAnimation();
                    }

                    // We found a watched video but the mutations can be out of order and hence we don't know which
                    // watched video is the first. scrollToWatchedVideo ensures that we end up with the first watched
                    // video by only allowing to scroll up.
                    scrollToWatchedVideo(addedNode);
                    break;
            }
        }
    }
}

function expectedNode(node, localName, className) {
    if (node.localName !== localName) {
        return false;
    }
    return node.classList.contains(className);
}

function isEarlyVideoNode(node) {
    // An early video node is the parent video node that contains all the nodes of a single video in the subscriptions
    // video list (high priority). The early video node is different for the list vs. grid view.

    // IMPORTANT: We need the same number of early/late video nodes so that early/lateVideoCount are in sync.

    // IMPORTANT: YouTube does gradual rollouts of changes. So always note the date when we are starting to handle
    // a new node and only remove old nodes once you are absolutely sure that they aren't in use by YouTube anymore.
    const listName = "ytd-shelf-renderer"; // Introduced 2024-10-01.
    const listClass = "ytd-item-section-renderer";
    const gridName = "ytd-rich-grid-media"; // Introduced 2024-10-01.
    const gridClass = "ytd-rich-item-renderer";

    if (node.localName !== listName && node.localName !== gridName) {
        return false;
    }
    return node.classList.contains(listClass) || node.classList.contains(gridClass);
}

function isLateVideoNode(node) {
    // A late video node is the node that represents the video length (low priority).
    // This video node needs to load with a similar (or slightly later) priority than the progress bar node of a watched video.

    // IMPORTANT: We need the same number of early/late video nodes so that early/lateVideoCount are in sync.

    // IMPORTANT: YouTube does gradual rollouts of changes. So always note the date when we are starting to handle
    // a new node and only remove old nodes once you are absolutely sure that they aren't in use by YouTube anymore.
    const localName = "ytd-thumbnail-overlay-now-playing-renderer"; // Introduced 2025-10-01.
    const className =  "ytd-thumbnail";

    if (node.localName !== localName) {
        return false;
    }
    return node.classList.contains(className);
}

function isWatchedVideoNode(node) {
    // A watched video node is a progress bar node that represents the how much of the respective video has been already watched.
    // The watched video node must only be present for (partially or fully) watched videos.

    // IMPORTANT: YouTube does gradual rollouts of changes. So always note the date when we are starting to handle
    // a new node and only remove old nodes once you are absolutely sure that they aren't in use by YouTube anymore.
    const localName = "ytd-thumbnail-overlay-resume-playback-renderer"; // Introduced 2023-12-09 (with extension launch).
    const className =  "ytd-thumbnail";

    if (node.localName !== localName) {
        return false;
    }
    return node.classList.contains(className);
}

function disconnectMutationObserver() {
    var diff = (Date.now() - lastVideoCountChange);
    if (diff < 15000) {
        console.log("Re-scheduling disconnect of MutationObserver. Current early/late video count: ", earlyVideoCount, "/", lateVideoCount);
        setTimeout(disconnectMutationObserver, 15000);
        return;
    }

    observer.disconnect();
    console.log("Disconnected MutationObserver.");

    if (earlyVideoCount != lateVideoCount) {
        // This indicates that one of the matched div elements occurs more frequently than the
        // other for some reason and hence the rubber banding likely isn't working as expected.
        // Recomendation: Double check in the Chrome DevTools the element counts.
        console.warn("Early/late video count mismatch (potential rubber banding problem): ", earlyVideoCount, "/", lateVideoCount);
    }
};


var firstWatchedVideoScroll = false;

async function scrollToWatchedVideo(node) {
    // Find the scroll target, which is the early video node above the given node.
    // Note: The early video node is the video node that contains all the nodes of a single video.
    var target = node;
    while (!isEarlyVideoNode(target)) {
        target = target.parentNode;
        if (target === null) {
            console.error("Couldn't find early video node parent for given node:", node);
            target = node;  // Fall back to the given node as scroll target.
            break;
        }
    }

    // Highlight the scroll target.
    target.style.backgroundColor = "rgba(255, 223, 0, 0.2)";

    var oldPos = document.documentElement.scrollTop;
	target.scrollIntoView({block: "end", inline: "start", behavior: "instant"});

    // Keep the scroll position as is for the first call of scrollToWatchedVideo.
    // After that the following code only allows to scroll up to ensure that we scroll to the first watched video.
    if (!firstWatchedVideoScroll) {
        firstWatchedVideoScroll = true;
        return;
    }

    // Undo scroll if we scrolled down.
    // The mutations sent by the MutationObserver can be out of order.
    // By not allowing to scroll down anymore we should end up with the first watched video.
    var newPos = document.documentElement.scrollTop;
    if (newPos > oldPos) {
        window.scrollTo({left: 0, top: oldPos, behavior: "instant"});
    }
}

var throttleTimeout;

function throttledScrollToEndOfPage() {
    if (!throttleTimeout) {
        // Schedule call of scrollToEndOfPage.
        let delayedScrollToEndOfPage = function() {
            throttleTimeout = undefined;
            scrollToEndOfPage();
        };
        delay = 1000;
        throttleTimeout = setTimeout(delayedScrollToEndOfPage, delay);
    }

    // Do nothing as a call of scrollToEndOfPage is already scheduled.
}

function scrollToEndOfPage() {
    if (foundWatchedVideo) {
        // No further new videos needed. This was likely a delayed call because of throttledScrollToEndOfPage.
        return;
    }
    window.scrollTo({left: 0, top: document.scrollingElement.scrollHeight, behavior: "instant"});
}

var animationDiv;
var animationImage;
var animationImageRotation = 0;

function updateAnimation() {
    if (animationDiv === undefined) {
        // Init animation.
        let div = document.createElement("div");
        animationDiv = div;
        div.setAttribute("id", "resume-youtube-subs-animation");
        div.style.cssText = "position: fixed; width: 192px; height: 192px; top: 64px; right: 64px; z-index: 100;";
        document.body.insertBefore(div, document.body.firstChild);

        let url1 = chrome.runtime.getURL("icon/icon-128.png");
        let img1 = document.createElement("img");
        img1.setAttribute("src", url1);
        img1.style.cssText = "position: absolute; width: 128px; height: 128px; margin: auto; top: 0px; left: 0px; bottom: 0px; right: 0px;";
        div.appendChild(img1);

        let url2 = chrome.runtime.getURL("animation/loading.svg");
        let img2 = document.createElement("img");
        animationImage = img2;
        img2.setAttribute("src", url2);
        img2.style.cssText = "position: absolute; width: 192px; height: 192px; margin: auto; top: 0px; left: 0px; bottom: 0px; right: 0px;";
        img2.style.transform = "rotate(" + animationImageRotation + "deg)";
        div.appendChild(img2);
    } else {
        // Update animation.
        animationImageRotation += 3;
        if (animationImageRotation >= 360) {
            animationImageRotation -= 360;
        }
        animationImage.style.transform = "rotate(" + animationImageRotation + "deg)";
    }
}

function removeAnimation() {
    document.body.removeChild(animationDiv);
}
