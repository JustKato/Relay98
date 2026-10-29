// Shared by the command-line build and customize.html. Keep this dependency-free
// and loadable as a classic script so the customizer works from file://.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Relay98Customization = factory();
}(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    const colors = [
        ['bg-0', 'Wells and inputs', '#1b1d1c'], ['bg-1', 'Side panels', '#222524'],
        ['bg-2', 'Main background', '#292c2b'], ['bg-3', 'Raised surfaces', '#323634'],
        ['bg-4', 'Hovered surfaces', '#3c403e'],
        ['bevel-light', 'Bevel highlight', '#5a5f5c'], ['bevel-mid', 'Bevel midtone', '#454a47'],
        ['bevel-dim', 'Bevel shade', '#1f2221'], ['bevel-dark', 'Bevel shadow', '#121413'],
        ['line', 'Panel separators', '#161817'], ['border', 'Borders', '#3a3f3c'],
        ['text-1', 'Primary text', '#eef0ec'], ['text-2', 'Body text', '#d9dcd6'],
        ['text-3', 'Secondary text', '#b3b8b1'], ['text-4', 'Muted text and icons', '#959b94'],
        ['text-5', 'Faint text', '#6e746d'],
        ['titlebar-start', 'Title bar start', '#2e4a3b'], ['titlebar-end', 'Title bar end', '#5b8360'],
        ['accent', 'Accent', '#4a7a54'], ['accent-hover', 'Accent hover', '#568a61'],
        ['accent-active', 'Accent pressed', '#3e6647'], ['accent-light', 'Focus and progress', '#7fae86'],
        ['select', 'Selection', '#3b5c45'], ['link', 'Links', '#8cc7a6'],
        ['amber', 'Warning', '#e8b04a'], ['green', 'Success', '#6fbf73'],
        ['red', 'Error', '#e0635a'], ['red-dark', 'Destructive buttons', '#b23f37'],
    ].map(([key, label, value]) => ({ key, label, default: value }));

    const original = Object.fromEntries(colors.map(({ key, default: value }) => [key, value]));
    function palette(label, surfaces, text, bevels, accents) {
        const result = { ...original };
        surfaces.forEach((value, i) => { result[`bg-${i}`] = value; });
        text.forEach((value, i) => { result[`text-${i + 1}`] = value; });
        ['bevel-light', 'bevel-mid', 'bevel-dim', 'bevel-dark', 'line', 'border'].forEach((key, i) => { result[key] = bevels[i]; });
        ['titlebar-start', 'titlebar-end', 'accent', 'accent-hover', 'accent-active', 'accent-light', 'select', 'link'].forEach((key, i) => { result[key] = accents[i]; });
        return { label, colors: result };
    }
    const palettes = {
        pine: { label: 'Pine · original', colors: original },
        discord: palette('Discord dark',
            ['#0e0e10', '#121214', '#1a1a1e', '#232327', '#2c2c30'],
            ['#f2f3f5', '#dbdee1', '#b5bac1', '#949ba4', '#6d6f78'],
            ['#4e5058', '#383a40', '#171719', '#09090b', '#0b0b0d', '#35363c'],
            ['#24263d', '#454b80', '#5865f2', '#6875f5', '#4752c4', '#949cf7', '#303452', '#a4b0ff']),
        blue: palette('Blue hour',
            ['#171c25', '#1e2633', '#252e3e', '#303b4e', '#3a475d'],
            ['#edf3fc', '#d5e0ef', '#afc0d8', '#92a6c2', '#71839e'],
            ['#596e8d', '#435570', '#1d2533', '#10151e', '#141b26', '#394a64'],
            ['#243e67', '#557db1', '#426b9e', '#4e7db5', '#345781', '#87b1e6', '#314f75', '#9fc9fb']),
        plum: palette('Plum dusk',
            ['#211923', '#2a202d', '#332838', '#403246', '#4e3e55'],
            ['#f5ecf7', '#e4d5e8', '#c6afcd', '#ae93b6', '#886e91'],
            ['#7a6085', '#5b4763', '#281e2c', '#19121c', '#201723', '#513e59'],
            ['#533160', '#8c5e9b', '#81548f', '#9765a6', '#684374', '#c092d0', '#63426e', '#d6ace6']),
        amber: palette('Amber terminal',
            ['#211c16', '#2a241c', '#342d23', '#41382b', '#4e4435'],
            ['#faf0dc', '#e8d9bc', '#cbb994', '#ad9a75', '#8b7a58'],
            ['#7d6d4e', '#5e5039', '#292219', '#18130e', '#201a12', '#51452f'],
            ['#5a4122', '#97733d', '#88642f', '#9c763b', '#6c4e26', '#d9ad60', '#614c2b', '#f0c779']),
    };

    // Keep old palette IDs readable in saved settings, but offer two current choices.
    const paletteOptions = ['pine', 'discord'];
    const avatarShapes = { square: { label: 'Square', radius: '0px' }, round: { label: 'Round', radius: '50%' } };
    const variants = {
        original: { label: 'Relay98 Original', filename: 'relay98-original', palette: 'pine', avatarShape: 'square' },
        discord: { label: 'Relay98 Discord Dark', filename: 'relay98-discord-dark', palette: 'discord', avatarShape: 'round' },
    };

    const sizes = [
        ['fontSize', 'Interface text', 16, 12, 24, '--r98-font-size'],
        ['codeSize', 'Code text', 15, 12, 24, '--r98-code-size'],
        ['messageSpacing', 'Message spacing', 4, 0, 24, '--r98-message-spacing'],
        ['sidebarWidth', 'Channel sidebar', 240, 180, 360, '--r98-sidebar-width'],
        ['memberWidth', 'Member list', 240, 180, 360, '--r98-member-width'],
        ['radius', 'Corner radius', 0, 0, 16, '--r98-radius'],
        ['scrollbarWidth', 'Scrollbar width', 14, 8, 20, '--r98-scrollbar-width'],
    ].map(([key, label, value, min, max, variable]) => ({ key, label, default: value, min, max, step: 1, variable }));

    const fontPresets = {
        retro: { label: 'Pixel · original', ui: "'Monocraft', 'PixeloidSans', 'Pixelify Sans', 'Tahoma', sans-serif", code: "'Monocraft', 'PixelOperatorMono', 'VT323', 'Courier New', monospace" },
        system: { label: 'System fonts', ui: "system-ui, 'Segoe UI', Arial, sans-serif", code: "ui-monospace, Consolas, 'Courier New', monospace" },
        mono: { label: 'Monospace', ui: "'Courier New', Courier, monospace", code: "'Courier New', Courier, monospace" },
    };

    function object(value, label, allowed) {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
        for (const key of Object.keys(value)) {
            if (!allowed.includes(key)) throw new Error(`Unknown ${label} option: ${key}`);
        }
        return value;
    }

    function font(value, label) {
        // Only CSS font-family lists, never arbitrary declarations or URLs.
        const family = /^(?:"[^"\\;{}<>]+"|'[^'\\;{}<>]+'|-?[\p{L}_][\p{L}\p{N} _-]*)$/u;
        if (typeof value !== 'string' || value.length > 500 || /[\u0000-\u001f\u007f]/.test(value) || !value.split(',').every((item) => family.test(item.trim()))) {
            throw new Error(`${label} must be a comma-separated list of font family names.`);
        }
        return value.trim();
    }

    function normalize(input = {}) {
        object(input, 'configuration', ['variant', 'avatarShape', 'palette', 'colors', 'sizes', 'fonts', 'effects', 'googleFonts']);
        const variant = input.variant === undefined ? 'original' : input.variant;
        if (typeof variant !== 'string' || !Object.hasOwn(variants, variant)) throw new Error(`Unknown theme version: ${variant}`);
        const avatarShape = input.avatarShape === undefined ? variants[variant].avatarShape : input.avatarShape;
        if (typeof avatarShape !== 'string' || !Object.hasOwn(avatarShapes, avatarShape)) throw new Error(`Unknown avatar shape: ${avatarShape}`);
        const selected = input.palette === undefined ? variants[variant].palette : input.palette;
        if (typeof selected !== 'string' || !Object.hasOwn(palettes, selected)) throw new Error(`Unknown palette: ${selected}`);
        const result = {
            variant, avatarShape,
            palette: selected,
            colors: { ...palettes[selected].colors },
            sizes: Object.fromEntries(sizes.map(({ key, default: value }) => [key, value])),
            fonts: { ui: fontPresets.retro.ui, code: fontPresets.retro.code },
            effects: { textures: true, bevels: true, shadows: true },
            googleFonts: true,
        };
        if (input.colors !== undefined) {
            object(input.colors, 'color', colors.map(({ key }) => key));
            for (const [key, value] of Object.entries(input.colors)) {
                if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new Error(`Color ${key} must be a six-digit hex color, such as #4a7a54.`);
                result.colors[key] = value.toLowerCase();
            }
        }
        if (input.sizes !== undefined) {
            object(input.sizes, 'size', sizes.map(({ key }) => key));
            for (const { key, min, max } of sizes) {
                if (!Object.hasOwn(input.sizes, key)) continue;
                const value = input.sizes[key];
                if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${key} must be a whole number from ${min} to ${max}.`);
                result.sizes[key] = value;
            }
        }
        if (input.fonts !== undefined) {
            object(input.fonts, 'font', ['ui', 'code']);
            for (const [key, value] of Object.entries(input.fonts)) result.fonts[key] = font(value, `Font ${key}`);
        }
        if (input.effects !== undefined) {
            object(input.effects, 'effect', ['textures', 'bevels', 'shadows']);
            for (const [key, value] of Object.entries(input.effects)) {
                if (typeof value !== 'boolean') throw new Error(`Effect ${key} must be true or false.`);
                result.effects[key] = value;
            }
        }
        if (input.googleFonts !== undefined) {
            if (typeof input.googleFonts !== 'boolean') throw new Error('googleFonts must be true or false.');
            result.googleFonts = input.googleFonts;
        }
        return result;
    }

    function toVariables(input) {
        const config = normalize(input);
        const vars = Object.fromEntries(Object.entries(config.colors).map(([key, value]) => [`--r98-${key}`, value]));
        vars['--r98-titlebar'] = `linear-gradient(to right, ${config.colors['titlebar-start']}, 75%, ${config.colors['titlebar-end']})`;
        vars['--r98-avatar-radius'] = avatarShapes[config.avatarShape].radius;
        vars['--r98-font'] = config.fonts.ui;
        vars['--r98-font-code'] = config.fonts.code;
        for (const { key, variable } of sizes) vars[variable] = `${config.sizes[key]}px`;
        if (!config.effects.textures) {
            for (const key of ['scan', 'dither', 'dots', 'bar', 'scrollbar-track', 'scrollbar-thumb']) vars[`--r98-pat-${key}`] = 'none';
        }
        if (!config.effects.bevels) {
            vars['--r98-raised'] = 'none';
            vars['--r98-sunken'] = 'none';
            vars['--r98-toolbar-shadow'] = 'none';
        }
        if (!config.effects.shadows) vars['--r98-drop'] = 'none';
        return vars;
    }

    function toCSS(input) {
        return `:root {\n${Object.entries(toVariables(input)).map(([key, value]) => `    ${key}: ${value};`).join('\n')}\n}\n`;
    }

    function luminance(hex) {
        const channels = hex.slice(1).match(/../g).map((value) => {
            const channel = parseInt(value, 16) / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }

    function contrast(first, second) {
        const a = luminance(first), b = luminance(second);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }

    function accentText(c) {
        const score = (text) => Math.min(contrast(text, c.accent), contrast(text, c['accent-hover']));
        const best = (choices) => choices.reduce((a, b) => score(a) >= score(b) ? a : b);
        const text = best([c['text-1'], c['bg-0']]);
        // Keep the palette's own text where possible. Fall back for custom colours
        // that make both candidates hard to read, including on hovered buttons.
        return score(text) >= 3 ? text : best([text, '#ffffff', '#000000']);
    }

    function toPalette(input) {
        const { colors: c } = normalize(input);
        return {
            // The crossover between black and white text contrast is about 0.179.
            base: luminance(c['bg-2']) > 0.179 ? 'light' : 'dark',
            colors: {
                background: c['bg-2'],
                input: c['bg-0'],
                panel: c['bg-1'],
                surface: c['bg-3'],
                surfaceHover: c['bg-4'],
                selection: c.select,
                border: c.border,
                separator: c.line,
                bevelLight: c['bevel-light'],
                bevelMid: c['bevel-mid'],
                bevelDim: c['bevel-dim'],
                bevelDark: c['bevel-dark'],
                text: c['text-1'],
                textBody: c['text-2'],
                textSecondary: c['text-3'],
                textMuted: c['text-4'],
                textFaint: c['text-5'],
                accent: c.accent,
                accentHover: c['accent-hover'],
                accentActive: c['accent-active'],
                accentFocus: c['accent-light'],
                onAccent: accentText(c),
                titlebarStart: c['titlebar-start'],
                titlebarEnd: c['titlebar-end'],
                link: c.link,
                danger: c.red,
                dangerStrong: c['red-dark'],
                warning: c.amber,
                success: c.green,
                overlay: `${c['bg-0']}80`,
                shadow: `${c['bevel-dark']}66`,
                tint: `${c['titlebar-start']}28`,
            },
        };
    }

    // https://spotifast.rocks/settings-and-files/#custom-themes
    function toSpotifast(input) {
        const { base, colors: c } = toPalette(input);
        return {
            base,
            colors: {
                window: c.background,
                panel: c.panel,
                surface: c.surface,
                surface_hover: c.surfaceHover,
                surface_active: c.selection,
                outline: c.border,
                text: c.text,
                secondary: c.textSecondary,
                dim: c.textMuted,
                accent: c.accent,
                accent_hover: c.accentHover,
                on_accent: c.onAccent,
                danger: c.danger,
                warning: c.warning,
                overlay: c.overlay,
                shadow: c.shadow,
                tint: c.tint,
            },
        };
    }

    function encode(input) {
        const json = JSON.stringify(normalize(input));
        if (typeof Buffer !== 'undefined') return Buffer.from(json, 'utf8').toString('base64url');
        const bytes = new TextEncoder().encode(json);
        return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function decode(encoded) {
        if (typeof encoded !== 'string' || encoded.length > 32768 || !/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) throw new Error('Invalid --custom payload. Copy the complete command from customize.html.');
        try {
            const bytes = typeof Buffer !== 'undefined'
                ? Buffer.from(encoded, 'base64url')
                : Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
            const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            return normalize(JSON.parse(json));
        } catch (error) {
            throw new Error(`Invalid customization: ${error.message}`);
        }
    }

    function command(input) {
        return `npm run build -- --custom ${encode(input)}`;
    }

    return { colors, sizes, palettes, paletteOptions, variants, avatarShapes, fontPresets, defaults: normalize(), normalize, toVariables, toCSS, toPalette, toSpotifast, encode, decode, command };
}));
