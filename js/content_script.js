// SPDX-License-Identifier: GPL-3.0

// Watch for mutations on the YouTube subscriptions page that is currently loading.
// To avoid brittleness caused by changes on the YouTube side we rely on all nodes under document node and not some deeper YouTube-specific node.
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

function onNodeMutations(mutations) {
    for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (!("addedNodes" in mutation)) {
            // Theoretically we could have a mutation that only has removed nodes.
            continue;
        }
        for (var j = 0; j < mutation.addedNodes.length; j++) {
            var addedNode = mutation.addedNodes[j];

            if (!("localName" in addedNode)) {
                continue;  // Skip all added nodes that don't have a local name.
            }

            // IMPORTANT: Everything below here depends on YouTube and can break if there are changes on the YouTube side.

            if (!addedNode.localName.startsWith("ytd-")) {
                continue; // Skip non-YouTube nodes.
            }

            switch(addedNode.localName) {
                // IMPORTANT: The various nodes of YouTube videos load with different priorities. For example the video thumbnail
                // loads in early (high priority) and the progress bar in later (lower priority).
                // Sadly this means that if this extension triggers the load of new videos (scrollToEndOfPage) too aggressively
                // that the load of lower priority nodes can be starved and hence it can take a lot longer (or sometimes
                // indefinitely) until the progress bar nodes are loaded and a watched video is found. To avoid this we trigger
                // the load of new videos only if enough videos have mostly loaded (earlyVideoCount isn't too far ahead of
                // lateVideoCount). Furthermore scrollToEndOfPage is throttled via throttledScrollToEndOfPage so the trigger to
                // load new videos happens less frequently and hence less aggressively.

                // IMPORTANT: YouTube does gradual rollouts of changes. So always note the date when we are starting to handle
                // a new node and only remove old nodes once you are absolutely sure that they aren't in use by YouTube anymore.

                // Parent video node that contains all the nodes of a single video in the subscriptions video list (high priority).
                case "ytd-rich-grid-media": // Grid view; Introduced 2024-10-01
                case "ytd-shelf-renderer": // List view; Introduced 2024-10-01
                    earlyVideoCount++;
                    if (earlyVideoCount == 1) {
                        console.log("Found first video (early).");
                    }
                    if (earlyVideoCount % 10 == 0) {
                        console.log("Video count (early): ", earlyVideoCount);
                    }
                    if (!foundWatchedVideo) {
                        // Trigger load of new videos, unless there are too many videos still loading.
                        if (earlyVideoCount - lateVideoCount <= 50) {
                            throttledScrollToEndOfPage();
                        }
                    }
                    break;

                // Video overlay area (contains for example the video length; low priority).
                // IMPORTANT: We need a video node that is present for all videos so that early/lateVideoCount are in sync.
                // Ideally this video node loads with a similar (or slightly later) priority than the progress bar node.
                case "ytd-thumbnail-overlay-now-playing-renderer": // Introduced 2024-10-01
                    lateVideoCount++;
                    if (lateVideoCount == 1) {
                        console.log("Found first video (late).");
                    }
                    if (lateVideoCount % 10 == 0) {
                        console.log("Video count (late): ", lateVideoCount);
                    }
                    if (!foundWatchedVideo) {
                        // Trigger load of new videos if most of the videos have loaded.
                        if (earlyVideoCount - lateVideoCount <= 10) {
                            throttledScrollToEndOfPage();
                        }
                    }
                    break;

                // Progress bar of a watched video (low priority).
                case "ytd-thumbnail-overlay-resume-playback-renderer": // Introduced 2023-12-09 (with extension launch)
                    if(!foundWatchedVideo) {
                        // We found a watched video and hence we no longer need to process any other video nodes.
                        foundWatchedVideo = true;
                        console.log("Found first watched video.");

                        // Schedule disconnect of MutationObserver and only process the remaining mutations.
                        // The delay is needed as not all progress bars of watched videos might be loaded yet
                        // and the progress bar of the newest watched video might be delayed.
                        // Once all mutations are handled the extension's job is done.
                        var scheduleDisconnect = function() {
                            observer.disconnect();
                            console.log("Disconnected MutationObserver.");
                        };
                        setTimeout(scheduleDisconnect, 10000); // Wait ten seconds for delayed progress bars to load.
                    }

                    // We found a watched video but the mutations can be out of order and hence we don't know which watched video is the newest.
                    // scrollToWatchedVideo ensures that we end up with the newest watched video by only allowing to scroll up.
                    scrollToWatchedVideo(addedNode);
                    break;
            }
        }
    }
}

var firstWatchedVideoScroll = false;

async function scrollToWatchedVideo(node) {
    // Some nodes don't have the offsetTop property and in this case we first find a parent element that has it.
    var parent = node;
	while (parent.offsetTop === 0) {
		parent = parent.parentNode;
	}

    var oldPos = document.documentElement.scrollTop;
	parent.scrollIntoView({block: "end", inline: "start", behavior: "instant"});
    var offset = 100; // Scroll a bit more to show the rest of the video tile. Particularly important for grid view.
    window.scrollBy({left: 0, top: offset, behavior: "instant"});

    // Keep the scroll position as is for the first call of scrollToWatchedVideo.
    // After that the following code only allows to scroll up to ensure that the newest watched video is scrolled to.
    if (!firstWatchedVideoScroll) {
        firstWatchedVideoScroll = true;
        return;
    }

    // Undo scroll if we scrolled down.
    // The mutations sent by the MutationObserver can be out of order.
    // By not allowing to scroll down anymore we should end up with the newest watched video.
    var newPos = document.documentElement.scrollTop;
    if (newPos > oldPos) {
        window.scrollTo({left: 0, top: oldPos, behavior: "instant"});
    }
}

var throttleTimeout;

function throttledScrollToEndOfPage() {
    if (!throttleTimeout) {
        // Schedule call of scrollToEndOfPage.
        var delayedScrollToEndOfPage = function() {
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
