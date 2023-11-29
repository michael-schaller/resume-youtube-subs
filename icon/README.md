# Resume YouTube subscriptions Chrome extension icon

## Icon license

The icon is licensed under the [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.

## Icon source

The icon has been created with [Google Drawings](https://docs.google.com/drawings). The icon source can be found [here](https://docs.google.com/drawings/d/1moEFNKpSQV19689p4Sf9qYxIKHlVwEi1EDLNgMV6PKg/edit?usp=sharing). `icon.svg` has been directly downloaded from Google Drawings.

## SVG to PNG conversion

To convert `icon.svg` to the various `icon-*.png` files you need [Inkscape](https://inkscape.org) installed. 

Under [Ubuntu](https://ubuntu.com)/[Debian](https://www.debian.org)/[Mint](https://linuxmint.com) Linux you can install it by running:

```shell
sudo apt install inkscape
```

The various PNG files can then be created from `icon.svg` under Linux by running:

```shell
for width in 16 32 48 128; do inkscape --export-type=png --export-width=$width --export-background-opacity=0 --export-filename=icon-$width.png icon.svg; done
```