# Relay98

A basic Windows 98 / Steam 2004 / CS 1.6 / neocities inspired theme for Discord, built for **Vesktop** and **BetterDiscord**.

Square corners, beveled "outset"/"inset" panels, a navy win98 titlebar gradient, a chunky classic scrollbar, and a CS1.6-mustard accent color in place of Discord's blurple.

Structurally inspired by [system24](https://github.com/refact0r/system24) (split `/src` files combined by a build script into one theme file), kept intentionally small: no flavors, no config toggles, no tests.

## Install

1. Build the theme (see below), or just grab `build/relay98.theme.css` directly.
2. Drop `relay98.theme.css` into your themes folder:
   - **Vesktop**: Settings → Vesktop Settings → Themes → open the themes folder, copy the file in, then enable it.
   - **BetterDiscord**: Settings → Themes → open the themes folder, copy the file in, then enable it.
3. Reload Discord (Ctrl+R).

## Build

No dependencies required.

```sh
npm run build   # builds build/relay98.theme.css once
npm run dev     # rebuilds automatically when files in src/ change
```

## Structure

```
src/
  variables.css   fonts + color palette, mapped onto Discord's CSS variables
  layout.css      square corners, panel bevels (guild list, chat, members, popouts)
  components.css  buttons, inputs, scrollbar
  titlebar.css    win98-style titlebar gradient for the channel header
scripts/build.js  concatenates src/*.css into build/relay98.theme.css
build/relay98.theme.css  the actual file you install
```

## Notes

Discord's internal component classnames are hashed and change on every release. This theme avoids hard-coding exact hashes (which would break on the next Discord update) by targeting the stable, human-readable prefixes of those classnames with `[class*="..."]` selectors, plus Discord's own long-lived CSS custom properties (`--background-primary`, `--text-normal`, etc.) wherever possible. That keeps things simple and reasonably durable, at the cost of not covering every single screen pixel-perfectly — PRs welcome if something looks off after a Discord update.
