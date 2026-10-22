// Shared by the command-line build and customize.html. Keep this dependency-free
// and loadable as a classic script so the customizer works from file://.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Relay98Customization = factory();
}(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    const colors = [
        ['bg-0', 'Wells and inputs', '#1b1d1c'], ['bg-1', 'Side panels', '#222524'],
        ['bg-2', 'Chat background', '#292c2b'], ['bg-3', 'Raised surfaces', '#323634'],
        ['bg-4', 'Hovered surfaces', '#3c403e'],
        ['bevel-light', 'Bevel highlight', '#5a5f5c'], ['bevel-mid', 'Bevel midtone', '#454a47'],
        ['bevel-dim', 'Bevel shade', '#1f2221'], ['bevel-dark', 'Bevel shadow', '#121413'],
        ['line', 'Panel separators', '#161817'], ['border', 'Borders', '#3a3f3c'],
        ['text-1', 'Headings', '#eef0ec'], ['text-2', 'Message text', '#d9dcd6'],
        ['text-3', 'Secondary text', '#b3b8b1'], ['text-4', 'Channels and icons', '#959b94'],
        ['text-5', 'Muted text', '#6e746d'],
        ['titlebar-start', 'Title bar start', '#2e4a3b'], ['titlebar-end', 'Title bar end', '#5b8360'],
        ['accent', 'Accent', '#4a7a54'], ['accent-hover', 'Accent hover', '#568a61'],
        ['accent-active', 'Accent pressed', '#3e6647'], ['accent-light', 'Focus and progress', '#7fae86'],
        ['select', 'Selection', '#3b5c45'], ['link', 'Links', '#8cc7a6'],
        ['amber', 'Mentions and idle', '#e8b04a'], ['green', 'Online and success', '#6fbf73'],
        ['red', 'Errors and busy', '#e0635a'], ['red-dark', 'Destructive buttons', '#b23f37'],
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
        object(input, 'configuration', ['palette', 'colors', 'sizes', 'fonts', 'effects', 'googleFonts']);
        const selected = input.palette === undefined ? 'pine' : input.palette;
        if (typeof selected !== 'string' || !Object.hasOwn(palettes, selected)) throw new Error(`Unknown palette: ${selected}`);
        const result = {
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

    return { colors, sizes, palettes, fontPresets, defaults: normalize(), normalize, toVariables, toCSS, encode, decode, command };
}));
