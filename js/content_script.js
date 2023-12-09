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

var foundFirstVideo = false;
var foundWatchedVideo = false;

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
                // IMPORTANT: YouTube does gradual rollouts of changes. So always note the date when we are starting to hande
                // a new node and only remove old nodes once you are absolutely sure that they aren't in use by YouTube anymore.

                // IMPORTANT: Make sure that these nodes are detected in list and grid view of the YouTube subscriptions page.

                // Progress bar of a watched video.
                case "ytd-thumbnail-overlay-resume-playback-renderer": // Introduced 2023-12-09 (with extension launch)
                    // We found a watched video but the mutations can be out of order and hence we don't know which watched video is the newest.
                    // scrollToWatchedVideo ensures that we end up with the newest watched video by only allowing to scroll up.
                    if(!foundWatchedVideo) {
                        foundWatchedVideo = true;
                        console.log("Found a watched video.");

                        // Schedule disconnect of MutationObserver and only process the remaining mutations.
                        // The delay is needed as not all progress bars of watched videos might be loaded yet
                        // and the progress bar of the newest watched video might be delayed.
                        // Once all mutations are handled the extension's job is done.
                        var scheduleDisconnect = function() {
                            observer.disconnect();
                            console.log("Disconnected MutationObserver.");
                        };
                        setTimeout(scheduleDisconnect, 5000); // Wait five seconds for delayed progress bars to load.
                    }
                    scrollToWatchedVideo(addedNode);
                    break;

                // Video row (grid view) or video (list view) in the subscriptions video list.
                case "ytd-rich-grid-row": // Grid view; Introduced 2023-12-09 (with extension launch)
                case "ytd-item-section-renderer": // List view; Introduced 2023-12-09 (with extension launch)
                    if(!foundFirstVideo) {
                        foundFirstVideo = true;
                        console.log("Found first video.");
                    }
                    if (!foundWatchedVideo) {
                        scrollToEndOfPage(); // Scroll down to the very end of the page to trigger the load of further videos.
                    }
                    break;
            }
        }
    }
}

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
    console.log("scrolled to video:", document.documentElement.scrollTop, parent);

    // Undo scroll if we scrolled down.
    // The mutations sent by the MutationObserver can be out of order.
    // By not allowing to scroll down anymore we should end up with the newest watched video.
    var newPos = document.documentElement.scrollTop;
    if (newPos > oldPos) {
        console.log(`undid scroll from ${oldPos} to ${newPos}`);
        window.scrollTo({left: 0, top: oldPos, behavior: "instant"});
    }
}

function scrollToEndOfPage() {
    console.log("scrolled to end of page");
    window.scrollTo({left: 0, top: document.scrollingElement.scrollHeight, behavior: "instant"});
}
