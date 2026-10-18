# Relay98

A retro-inspired, modern dark theme for Discord, built for **Vesktop** and **BetterDiscord**.

Structurally inspired by [system24](https://github.com/refact0r/system24)

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

## Screenshot demos

Run `npm run build`, then open any of these static pages in a browser:

- `demos/chat.html` — server rail, channels, messages, mentions, code, reactions, and members.
- `demos/friends.html` — direct messages, online friends, buttons, and activity cards.
- `demos/settings.html` — Appearance settings, selection, radios, switches, sliders, and inputs.

Each page loads `../build/relay98.theme.css` automatically. The shared `demos/discord.css` supplies a mock Discord layout; the built theme supplies the actual colors, fonts, textures, and component overrides. These are static fixtures, not connected Discord clients.

For a different build, pass its URL through `?theme=...`, relative to the demo page. For example, `demos/chat.html?theme=../build/relay98.theme.css`. When opening the HTML with `file://`, the parameter can also be an absolute filesystem path or a `file://` URL. URL-encode the value if it contains spaces, `#`, or `&`. When serving over HTTP, serve the CSS over HTTP as well.

Use a **1440 × 900** viewport for screenshots. In browser automation, wait for the theme and fonts before capturing:

```js
await page.goto(demoUrl);
await page.evaluate(() => window.demoReady);
await page.screenshot({ path: 'chat.png' });
```

Alternatively, wait for `html[data-demo-ready="true"]`. A stylesheet loading failure rejects `window.demoReady`, sets `html[data-demo-status="error"]`, and displays an error instead of silently capturing an unthemed page. Icons and content are local and fixed; the theme's Google Fonts import needs network access unless its preferred fonts are installed locally.

## Structure

```
src/
  00-variables.css   palette + fonts, mapped onto every Discord color token
  10-layout.css      per-area patterns, title bars, panel lines, selection, menus, tooltips
  20-components.css  beveled buttons, sunken inputs, code blocks, scrollbars
scripts/build.js     concatenates src/*.css (in filename order) into build/relay98.theme.css
build/relay98.theme.css  the actual file you install
demos/               three static Discord views for screenshots, plus shared layout and loader
```

To recolor, edit the `--r98-*` variables at the top of `src/00-variables.css`.

## Fonts

Vesktop blocks external resources unless they come from GitHub, GitLab, Codeberg, Imgur, Discord or Google Fonts. The theme uses `PixeloidSans` / `PixelOperatorMono` if they're installed locally, otherwise it falls back to Google Fonts' `Pixelify Sans` / `VT323`.

## Notes

Like system24/midnight, layout rules target Discord's current hashed class names (e.g. `.guilds__5e434`). If Discord renames one in an update, only that rule stops applying; the colors keep working because they come from Discord's CSS variables.
