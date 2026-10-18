# Relay98

A retro-inspired, modern dark theme for Discord, built for **Vesktop** and **BetterDiscord**. Vibe taken from [danlegt.com](https://danlegt.com).

Pixel fonts, cool slate-gray surfaces (not AMOLED black), navy → blue title bars (`#000078 → #0f80cd`), soft beveled buttons, sunken text fields, hard pixel drop shadows on menus, and a faint dither + scanline texture over everything to keep it easy on the eyes.

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
  00-variables.css   palette + fonts, mapped onto every Discord color token
  10-layout.css      texture overlay, title bars, panel lines, selection, menus, tooltips
  20-components.css  beveled buttons, sunken inputs, code blocks, scrollbars
scripts/build.js     concatenates src/*.css (in filename order) into build/relay98.theme.css
build/relay98.theme.css  the actual file you install
```

To recolor, edit the `--r98-*` variables at the top of `src/00-variables.css`. To turn off the texture, add `:root { --r98-texture-opacity: 0; }` to your QuickCSS.

## Fonts

Vesktop blocks external resources unless they come from GitHub, GitLab, Codeberg, Imgur, Discord or Google Fonts. The theme uses `PixeloidSans` / `PixelOperatorMono` if they're installed locally, otherwise it falls back to Google Fonts' `Pixelify Sans` / `VT323`.

## Notes

Like system24/midnight, layout rules target Discord's current hashed class names (e.g. `.guilds__5e434`). If Discord renames one in an update, only that rule stops applying; the colors keep working because they come from Discord's CSS variables.
