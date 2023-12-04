# Resume YouTube subscriptions Chrome extension

## Chrome Web Store

The extension isn't published in the Chrome Web Store, yet.

## License

The extension code is licensed under the [GPL v3](LICENSE) license. The extension icon is licensed under the [CC BY-NC-SA 4.0](icon/LICENSE) license.

## How the extension works

On click of the extension icon a new tab for the YouTube subscriptions is opened and JavaScript code is injection to find the newest watched video.

TODO: Explain how finding the newest watched video works.

## Extension permissions

### `permissions`

* `scripting`: Needed to inject JavaScript code into the YouTube subscriptions page to find the newest watched video. This injection only happens for the YouTube subscriptions tab opened by the extension.

### `host_permissions`

* `https://www.youtube.com/feed/subscriptions`: Needed to inject JavaScript code into the YouTube subscriptions page to fing the newest watched video. This injection only happens for the YouTube subscriptions tab opened by the extension.
