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

You'll need Node.js 20 or newer and npm. The CSS build has no dependencies to install.

```sh
npm run build   # builds build/relay98.theme.css once
npm run dev     # rebuilds automatically when files in src/ change
```

## Customize your theme

Open [customize.html](customize.html) in your browser from a downloaded or cloned copy of this repo. No server is needed.

1. Pick a version and palette, then adjust colours, fonts, sizes and effects. Each pattern (scanlines, dot grid, dither, title bar stripes, scrollbar) has its own switch.
2. Use the tabs above the preview to switch between Discord (chat, friends) and Spotifast (home, liked songs).
3. Copy the build command, paste it into a terminal in the Relay98 folder, and install `build/relay98-custom.theme.css` using the steps above. It shows up as **Relay98 Custom**; disable the original while using it.

The command works in Bash, PowerShell and Command Prompt. Your settings are encoded in the argument, so nothing needs escaping. Your source files and `build/relay98.theme.css` stay unchanged.

The preview is a sample layout, so check panel sizes in Discord itself. The page makes no external requests. Custom fonts must be installed on your computer. The Google Fonts switch only decides whether the built theme loads Pixelify Sans and VT323 from Google.

The Spotifast preview uses the same colours as the Spotifast export. Album covers are optional: see [demos/images/spotifast/](demos/images/spotifast/README.md) for the filenames it looks for.

Your browser remembers the last valid settings. Use **Save** to keep a copy and **Load** to continue editing later. You can also build straight from the saved file:

```sh
npm run build -- --config relay98-settings.json
npm run build -- --config relay98-settings.json --output build/my-theme.theme.css
npm run dev -- --config relay98-settings.json
```

The last command watches both the CSS source and your settings file. A failed rebuild leaves the last successful CSS file in place.

For hand-written settings, omitted fields use their defaults. This example uses the blue palette, larger text, system fonts, no scanlines or dot grid, and no Google font requests:

```json
{
  "palette": "blue",
  "sizes": { "fontSize": 18, "codeSize": 16 },
  "fonts": {
    "ui": "system-ui, Arial, sans-serif",
    "code": "Consolas, monospace"
  },
  "effects": { "scanlines": false, "dots": false },
  "googleFonts": false
}
```

Effect switches are `scanlines`, `dots`, `dither`, `stripes`, `scrollbar`, `bevels` and `shadows`. Older settings with `"textures": false` still turn every pattern off. Colours use six-digit hex values. Sizes use whole pixels within the ranges shown on the page. The build rejects unknown options and invalid values with an error message. Run `npm run build -- --help` for the available command-line options.

## Theme versions

The original theme is still `build/relay98.theme.css`. For darker panels and round profile pictures, install [build/relay98-discord-dark.theme.css](build/relay98-discord-dark.theme.css) instead. It appears as **Relay98 Discord Dark**. Enable only one Relay98 theme at a time.

```sh
npm run build -- --variant discord
npm run build -- --variant discord --format spotifast
```

In the editor, **Version** applies a palette and avatar shape together. **Avatars** changes just the profile pictures, independently of panel corners. Version, palette, and shape choices are saved with your settings and included in the build command. Old settings without these options keep the original defaults.

To add a version, edit `variants` in `scripts/customization.js`. Each entry defines its label, output filename, palette ID, and avatar shape. Add palettes to `palettes` and list their IDs in `paletteOptions` to show them in the editor. The older Blue hour, Plum dusk, and Amber terminal palettes remain available in saved settings, but only Pine and Discord dark are offered in the picker for now.

## Spotifast theme

Use [build/relay98.spotifast.json](build/relay98.spotifast.json) for the original Pine colours, or open `customize.html` and click **Spotifast theme** to download your current colours.

From the command line:

```sh
npm run build -- --format spotifast
npm run build -- --format spotifast --config relay98-settings.json
npm run dev -- --format spotifast --config relay98-settings.json
```

The output is `build/relay98.spotifast.json`, or `build/relay98-custom.spotifast.json` when you supply settings. You can also append `--format spotifast` to the command copied from the editor. Use `--output build/my-spotifast.json` to choose another filename.

1. In Spotifast, open **Settings > Appearance > Theme** and use **Open themes folder**.
2. Copy the `.json` file into that folder.
3. Run `spotifast reload-themes` if Spotifast is open, then select the filename in the Theme picker. Linux also detects changes automatically.
4. Turn off **Colour from album art** if you want every page to keep the fixed palette.

The file follows [Spotifast's theme format](https://spotifast.rocks/settings-and-files/#custom-themes). It colours the main window and keeps Spotifast's own fonts and layout. Winamp skins are separate.

## Reuse the palette

Click **Palette JSON** in the editor, or run:

```sh
npm run build -- --format palette
npm run build -- --format palette --config relay98-settings.json
```

This writes `build/relay98.palette.json`, or `build/relay98-custom.palette.json` with settings. It contains a `base` (`dark` or `light`) and a `colors` object with names such as `background`, `panel`, `text`, `accent`, and `success`. All palette shades are included, without Discord settings or Spotifast-specific names. Colours use `#RRGGBB`, with an extra alpha byte for overlay, shadow, and tint colours.

Both JSON exports use the same palette. The background determines the light/dark base, and accent text is chosen against both the normal and hovered button colours. Overlay and shadow colours follow your input and bevel shades.

**Save** keeps the full editor setup, including fonts and spacing, so **Load** can bring it back. Use that file to continue editing. The palette downloads are for use in other apps.

## Screenshots

```sh
npm run screenshot
```

The command rebuilds the theme and uses [Playwright and Chromium](https://playwright.dev/docs/library) to take `1920`×`1080` screenshots of the three demo pages. It replaces `assets/chat.png`, `assets/friends.png`, and `assets/settings.png`, the pictures shown above.

Screenshots need Node.js 20 or newer. On the first run, the script downloads Playwright into `demos/node_modules/` and Chromium into `.tools/chromium/`, so you'll need internet access. Git ignores both folders. After setup, screenshots use the cat photos and pixel fonts in this repo without fetching external resources. You can use an existing browser by setting `CHROMIUM_BIN=/path/to/chromium`.

Open `demos/chat.html`, `demos/friends.html`, or `demos/settings.html` to inspect a demo in your browser. They load the built theme automatically; use `?theme=...` to point at another CSS URL. Screenshot scripts can wait for `window.demoReady`. Photo credits are in `demos/images/`, and font licenses are in `demos/fonts/`.

To inspect a custom build in the chat demo, open `demos/chat.html?theme=../build/relay98-custom.theme.css`. The screenshot command always builds and captures the standard theme.

## Checks

```sh
npm test             # build, settings validation, and demo-loader regressions
npm run test:browser  # customizer interactions and compiled CSS in Chromium
```

Browser checks use the same Playwright and Chromium setup as screenshots. They exercise the local page, the generated build command, and the demo pages without replacing the README pictures.

The unit suite includes a Bash command test, so Bash must be available. GitHub Actions runs these checks on Node.js 20 and 24 and checks the committed CSS and JSON exports. Releases run the tests before building the CSS variants and JSON exports.

## Structure

```
src/
  00-variables.css   palette + fonts, mapped onto every Discord color token
  10-layout.css      per-area patterns, title bars, panel lines, selection, menus, tooltips
  20-components.css  beveled buttons, sunken inputs, code blocks, scrollbars
scripts/build.js     concatenates src/*.css (in filename order) into build/relay98.theme.css
scripts/customization.js  shared settings, presets, and validation for the page and build
scripts/screenshot.js  optional local screenshot command
scripts/test-browser.js  browser checks for the customizer and demo pages
customize.html       local theme customizer and build-command generator
customize.css        editor layout plus the Discord and Spotifast previews
customize.js         controls, preview tabs, saved settings, and command copying
build/relay98.theme.css  the actual file you install
build/relay98.spotifast.json  matching Spotifast colour palette
build/relay98.palette.json  colours for use in other projects
demos/               three static Discord views for screenshots, plus shared layout and loader
assets/              generated 1920 × 1080 PNGs used above
```

To change the defaults in the source, edit the `--r98-*` variables at the top of `src/00-variables.css`. The customizer's presets and allowed settings live in `scripts/customization.js`.

## Fonts

The theme prefers [Monocraft](https://github.com/IdreesInc/Monocraft) for interface text and code when it's installed on your computer. Otherwise, it uses `PixeloidSans` and `PixelOperatorMono` if available, then Google's `Pixelify Sans` and `VT323`. The demos use the same font choices, with bundled copies of the Google fonts for screenshots.

I recommend installing [Monocraft](https://github.com/IdreesInc/Monocraft) as it's a cool font anyway, but you can still have a more than decent experience with the google pixel-art fonts too.

## Discord updates

Like system24 and midnight, the layout rules use Discord's hashed class names, such as `.guilds__5e434`. If Discord renames a class, its layout rule will stop matching. 

Colors still work because they use Discord's CSS variables.

## AI assistance

I originally used this as a sketchy theme that I was basically maintaining along the time, but the theme's colours and styling are completely written by me basically with some AI cleanup.

AI has helped with parts of the theme code, the demo pages and the screenshot tooling.
