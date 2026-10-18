# Relay98

A retro-inspired, modern dark theme for Discord, built for **Vesktop** and **BetterDiscord**.

Structurally inspired by [system24](https://github.com/refact0r/system24)

![Relay98 server chat demo](assets/chat.png)
![Relay98 friends demo](assets/friends.png)
![Relay98 appearance settings demo](assets/settings.png)

## Install

1. Download `relay98.theme.css` from the [latest release](https://github.com/danlegt/Relay98/releases/latest), or build the theme (see below).
2. Drop `relay98.theme.css` into your themes folder:
   - **Vesktop**: Settings → Vesktop Settings → Themes → open the themes folder, copy the file in, then enable it.
   - **BetterDiscord**: Settings → Themes → open the themes folder, copy the file in, then enable it.
3. Reload Discord (Ctrl+R).

## Build

Node/Npm required

```sh
npm run build   # builds build/relay98.theme.css once
npm run dev     # rebuilds automatically when files in src/ change
```

## Screenshots

```sh
npm run screenshot
```

This rebuilds the theme and captures the three Discord demo pages at **1920 × 1080** using [Playwright and Chromium](https://playwright.dev/docs/library). Each run overwrites `assets/chat.png`, `assets/friends.png`, and `assets/settings.png`, which are displayed above.

The first run requires Node.js 20+ and internet access to install the isolated screenshot dependency in `demos/node_modules/` and download Chromium into `.tools/chromium/`. Both directories are ignored by Git. Later captures use the local cat pictures and pixel fonts without fetching external resources. Set `CHROMIUM_BIN=/path/to/chromium` to use an existing browser instead of downloading one.

The fixtures are `demos/chat.html`, `demos/friends.html`, and `demos/settings.html`. Each loads the built theme automatically, accepts `?theme=...` for a different CSS URL, and exposes `window.demoReady` for browser automation. Avatar photo credits and font licenses are included in `demos/images/` and `demos/fonts/`.

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

To recolor, edit the `--r98-*` variables at the top of `src/00-variables.css`.

## Fonts

Vesktop blocks external resources unless they come from GitHub, GitLab, Codeberg, Imgur, Discord or Google Fonts. The theme uses `PixeloidSans` / `PixelOperatorMono` if they're installed locally, otherwise it falls back to Google Fonts' `Pixelify Sans` / `VT323`.

## Notes

Like system24/midnight, layout rules target Discord's current hashed class names (e.g. `.guilds__5e434`). If Discord renames one in an update, only that rule stops applying; the colors keep working because they come from Discord's CSS variables.
