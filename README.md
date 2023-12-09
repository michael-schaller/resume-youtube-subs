# Resume YouTube subscriptions Chrome extension

A Chrome extension that opens your YouTube subscriptions in a new tab and scrolls to the newest watched video.

## Chrome Web Store

The extension isn't published in the Chrome Web Store, yet.

## License

The extension code is licensed under the [GPL v3](LICENSE) license. The extension icon is licensed under the [CC BY-NC-SA 4.0](icon/LICENSE) license.

## How the extension works

On click of the extension icon a new tab for the YouTube subscriptions is opened and JavaScript code is injected to find the newest watched video.

The injected JavaScript code uses a [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to watch for newly added videos. As long as the newest watched video isn't found the code scrolls down to the end of the subscriptions page when a new video appears to trigger the load of further videos. If the newest watched video is found it is scrolled into view and all further processing ends.

## Extension permissions

### `permissions`

* `scripting`: Needed to inject JavaScript code into the YouTube subscriptions page to find the newest watched video. This injection only happens for the YouTube subscriptions tab opened by the extension.

### `host_permissions`

* `https://www.youtube.com/feed/subscriptions`: Needed to inject JavaScript code into the YouTube subscriptions page to fing the newest watched video. This injection only happens for the YouTube subscriptions tab opened by the extension.
