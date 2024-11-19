# Resume YouTube subscriptions Chrome extension

A Chrome extension that opens your YouTube subscriptions in a new tab and scrolls to the newest watched video.

## Chrome Web Store

The extension can be found [here](https://chromewebstore.google.com/detail/resume-youtube-subs/fejikpidmpidoficeahddbejjkanfbde).

## Get support

If you encountered an issue, have a feature request or just a question just [file a new issue report](https://github.com/michael-schaller/resume-youtube-subs/issues/new/choose).

## License

The extension code is licensed under the [GPL v3](LICENSE) license. The extension icon is licensed under the [CC BY-NC-SA 4.0](icon/LICENSE) license.

## How the extension works

On click of the extension icon a new tab for the YouTube subscriptions is opened and JavaScript code is injected as  early as possible to find the newest watched video.

The injected JavaScript code uses a [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to watch for newly added videos. As long as no watched video is found the code scrolls down to the end of the subscriptions page to trigger the load of further videos. If a watched video is found it is scrolled into view if it is newer (further up) than the previously found watched video. In the end this should always scroll to the newest watched video.

## Extension permissions

### `permissions`

* `scripting`: Needed to inject JavaScript code into the YouTube subscriptions page to find the newest watched video. This injection only happens for the YouTube subscriptions tab opened by the extension.

### `host_permissions`

* `https://www.youtube.com/feed/subscriptions`: Needed to inject JavaScript code into the YouTube subscriptions page to fing the newest watched video. This injection only happens for the YouTube subscriptions tab opened by the extension.

## Release instructions

The release instructions can be found [here](https://github.com/michael-schaller/resume-youtube-subs/wiki#release-instructions).
