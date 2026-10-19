# Relay98

A dark Discord theme for Vesktop and BetterDiscord, with pixel fonts and retro window styling.

The layout takes cues from [system24](https://github.com/refact0r/system24).

![Relay98 server chat demo](assets/chat.png)
![Relay98 friends demo](assets/friends.png)
![Relay98 appearance settings demo](assets/settings.png)

## Install

1. Download `relay98.theme.css` from the [latest release](https://github.com/danlegt/Relay98/releases/latest), or build it using the commands below.
2. Copy the file into your themes folder and enable it:
   - Vesktop: Settings → Vesktop Settings → Themes → open the themes folder.
   - BetterDiscord: Settings → Themes → open the themes folder.
3. Reload Discord (Ctrl+R).

## Build

You'll need Node.js and npm.

```sh
npm run build   # builds build/relay98.theme.css once
npm run dev     # rebuilds automatically when files in src/ change
```

## Screenshots

```sh
npm run screenshot
```

The command rebuilds the theme and uses [Playwright and Chromium](https://playwright.dev/docs/library) to take `1920`×`1080` screenshots of the three demo pages. It replaces `assets/chat.png`, `assets/friends.png`, and `assets/settings.png`, the pictures shown above.

Screenshots need Node.js 20 or newer. On the first run, the script downloads Playwright into `demos/node_modules/` and Chromium into `.tools/chromium/`, so you'll need internet access. Git ignores both folders. After setup, screenshots use the cat photos and pixel fonts in this repo without fetching external resources. You can use an existing browser by setting `CHROMIUM_BIN=/path/to/chromium`.

Open `demos/chat.html`, `demos/friends.html`, or `demos/settings.html` to inspect a demo in your browser. They load the built theme automatically; use `?theme=...` to point at another CSS URL. Screenshot scripts can wait for `window.demoReady`. Photo credits are in `demos/images/`, and font licenses are in `demos/fonts/`.

## Structure

```
src/
  00-variables.css   palette + fonts, mapped onto every Discord color token
  10-layout.css      per-area patterns, title bars, panel lines, selection, menus, tooltips
  20-components.css  beveled buttons, sunken inputs, code blocks, scrollbars
scripts/build.js     concatenates src/*.css (in filename order) into build/relay98.theme.css
scripts/screenshot.js  optional local screenshot command
build/relay98.theme.css  the actual file you install
demos/               three static Discord views for screenshots, plus shared layout and loader
assets/              generated 1920 × 1080 PNGs used above
```

To change the colors, edit the `--r98-*` variables at the top of `src/00-variables.css`.

## Fonts

The theme prefers [Monocraft](https://github.com/IdreesInc/Monocraft) for interface text and code when it's installed on your computer. Otherwise, it uses `PixeloidSans` and `PixelOperatorMono` if available, then Google's `Pixelify Sans` and `VT323`. The demos use the same font choices, with bundled copies of the Google fonts for screenshots.

I recommend installing [Monocraft](https://github.com/IdreesInc/Monocraft) as it's a cool font anyway, but you can still have a more than decent experience with the google pixel-art fonts too.

## Discord updates

Like system24 and midnight, the layout rules use Discord's hashed class names, such as `.guilds__5e434`. If Discord renames a class, its layout rule will stop matching. 

Colors still work because they use Discord's CSS variables.

## AI assistance

I originally used this as a sketchy theme that I was basically maintaining along the time, but the theme's colours and styling are completely written by me basically with some AI cleanup.

AI has helped with parts of the theme code, the demo pages and the screenshot tooling.
