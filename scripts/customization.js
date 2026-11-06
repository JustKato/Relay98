// Shared by the CLI and customize.html. Keep it dependency-free and use a
// classic script so the editor works from file://.
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
        ['text-3', 'Secondary text', '#b3b8b1'], ['text-4', 'Muted text and icons', '#aeb4ac'],
        ['text-5', 'Faint text', '#a7aca4'],
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
        pine: { label: 'Pine', colors: original },
        carbon: palette('Carbon paper',
            ['#1b1c1d', '#232526', '#2c2e30', '#35383a', '#414548'],
            ['#f0eeea', '#dad8d3', '#b9b7b1', '#a2a39e', '#949892'],
            ['#707572', '#515653', '#202322', '#111413', '#171a19', '#4a504d'],
            ['#3d4548', '#576367', '#4f6066', '#5b6f75', '#46585e', '#a7bec3', '#3e5057', '#b4d0d7']),
        copper: palette('Copperwire',
            ['#211b19', '#2a2320', '#332b27', '#3e342e', '#4a3e36'],
            ['#f5ece1', '#e2d4c6', '#c6b29f', '#b59c88', '#a69182'],
            ['#836a55', '#5d4b3d', '#281f1a', '#160f0c', '#1d1510', '#5c493a'],
            ['#593d2a', '#805336', '#82502e', '#925c38', '#714327', '#d6a06c', '#5d3e2d', '#efb986']),
        diskette: palette('Diskette',
            ['#1c1b24', '#24222d', '#2d2a37', '#373341', '#433e4e'],
            ['#f1edf5', '#dbd5e4', '#bdb3ce', '#a79ab9', '#9c90a9'],
            ['#746786', '#544a63', '#221d2b', '#13101a', '#1a1522', '#50465e'],
            ['#443453', '#655078', '#72538a', '#7d5b93', '#5a416e', '#b99bce', '#493658', '#cdb3e3']),
        tidepool: palette('Tidepool',
            ['#172122', '#1e2a2c', '#263437', '#304043', '#3a4c4f'],
            ['#e9f1e9', '#d0dfd7', '#aec5ba', '#91b0a1', '#87a196'],
            ['#5d7d75', '#426057', '#1b2a27', '#0e1715', '#14211e', '#3c5850'],
            ['#294b4a', '#3e6b66', '#32675f', '#3d766d', '#2d5e58', '#84bdb0', '#2c504c', '#a0d8c8']),
        oxblood: palette('Oxblood',
            ['#21191b', '#2a2023', '#34282b', '#403136', '#4d3b41'],
            ['#f6eded', '#e4d5d5', '#c7afb2', '#b5989e', '#a68d93'],
            ['#80616a', '#5e454d', '#281c21', '#170f13', '#201519', '#5a414a'],
            ['#532d36', '#7b414c', '#8a434f', '#a25461', '#71343f', '#cf8f97', '#5b323b', '#e8adb3']),
        sandstone: palette('Sandstone',
            ['#221f19', '#2a2720', '#343027', '#3f3a30', '#4b4539'],
            ['#f5f0df', '#dfd8c4', '#c3baa1', '#afa58a', '#a29984'],
            ['#80765c', '#5e5642', '#29251b', '#18150e', '#201c13', '#5a513d'],
            ['#514731', '#716449', '#706044', '#7b6b4b', '#615337', '#c7b184', '#504732', '#dfcba1']),
        afterglow: palette('Afterglow',
            ['#211c20', '#2a2429', '#342d33', '#40373d', '#4d4249'],
            ['#f7edef', '#e4d5db', '#c7b1bc', '#b69eab', '#a6929d'],
            ['#826b78', '#5e4b58', '#281f27', '#170f17', '#201720', '#5a4654'],
            ['#564052', '#79546c', '#7c4d65', '#8d5973', '#6c4258', '#d49cb4', '#583d4e', '#edbbcf']),
        slate: palette('Slate',
            ['#1a1f25', '#222831', '#2b323c', '#353d49', '#404958'],
            ['#edf1f4', '#d5dee7', '#b2c0d0', '#97aabf', '#899db5'],
            ['#65798f', '#485a70', '#1f2836', '#101722', '#17202c', '#42556c'],
            ['#34465e', '#4c6686', '#496589', '#526f94', '#3f587b', '#9bb8da', '#354b68', '#b1cef1']),
        amberglass: palette('Amberglass',
            ['#211e17', '#2a271e', '#343025', '#3f3b2c', '#4b4634'],
            ['#f5efdb', '#e2d8bc', '#c5b895', '#b4a681', '#a4987a'],
            ['#827851', '#605738', '#292418', '#17130b', '#201a10', '#5b5134'],
            ['#56451d', '#786029', '#7a5c23', '#876629', '#6f521d', '#d8b663', '#574621', '#edcb7a']),
        // Steam's original olive surfaces and mustard, preserved in OG-Steam's
        // resource/styles/steam.styles. Text and selection are adjusted for contrast.
        // https://github.com/ungstein/OG-Steam
        '2004': palette('2004',
            ['#3e4637', '#444f3d', '#4c5844', '#536149', '#5a6a50'],
            ['#eff6ee', '#e0e6db', '#d8ded3', '#d2dbc7', '#c5cebd'],
            ['#889180', '#707b63', '#3e4637', '#282e22', '#30382a', '#727d65'],
            ['#4c5844', '#5a6a50', '#958831', '#b0a047', '#807424', '#c4b550', '#625a28', '#f0e5a8']),
        // Legacy IDs stay available to saved settings and command-line builds.
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

    const paletteOptions = ['pine', 'carbon', 'copper', 'diskette', 'tidepool', 'oxblood', 'sandstone', 'afterglow', 'slate', 'amberglass', '2004'];
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

    const patterns = [
        { key: 'scanlines', label: 'Scanlines', hint: 'Chat and toolbars', vars: ['scan'] },
        { key: 'dots', label: 'Dot grid', hint: 'Channel and member lists', vars: ['dots'] },
        { key: 'dither', label: 'Dither', hint: 'Server rail and user panel', vars: ['dither'] },
        { key: 'stripes', label: 'Title bar stripes', hint: 'Lines over the title bar', vars: ['bar'] },
        { key: 'scrollbar', label: 'Scrollbar pattern', hint: 'Checkered track and grip', vars: ['scrollbar-track', 'scrollbar-thumb'] },
    ];
    const effectControls = [
        { key: 'bevels', label: 'Bevels', hint: 'Raised buttons and inset fields', group: 'surfaces', default: true },
        { key: 'shadows', label: 'Shadows', hint: 'Floating panels and menus', group: 'surfaces', default: true },
        { key: 'gradient', label: 'Title bar gradient', hint: 'Blend the two title bar colours', group: 'surfaces', default: true },
        { key: 'panelBorders', label: 'Panel borders', hint: 'Lines between sidebars and chat', group: 'surfaces', default: true },
        { key: 'messageDividers', label: 'Message dividers', hint: 'Separate message groups', group: 'extras', default: false },
        { key: 'alternatingMessages', label: 'Alternating rows', hint: 'Shade every other message group', group: 'extras', default: false },
        { key: 'textGlow', label: 'Text glow', hint: 'Message text and window titles', group: 'extras', default: false },
    ];
    const effectRanges = [
        { key: 'textureStrength', label: 'Texture strength', default: 100, min: 0, max: 200, step: 1, unit: '%', group: 'textures' },
        { key: 'textureScale', label: 'Texture scale', default: 100, min: 50, max: 200, step: 1, unit: '%', group: 'textures' },
        { key: 'shadowOffset', label: 'Shadow offset', default: 3, min: 0, max: 8, step: 1, unit: 'px', group: 'surfaces', dependsOn: { key: 'shadows', value: true } },
        { key: 'glowRadius', label: 'Glow size', default: 2, min: 1, max: 8, step: 1, unit: 'px', group: 'extras', dependsOn: { key: 'textGlow', value: true } },
    ];
    const spotifastOptions = [
        { key: 'tint', label: 'Page tint', hint: 'Header colour fade', type: 'boolean', default: true },
        { key: 'tintStrength', label: 'Tint strength', type: 'number', default: 100, min: 0, max: 200, step: 1, unit: '%', dependsOn: { key: 'tint', value: true } },
        { key: 'shadows', label: 'Popup shadows', hint: 'Menus and floating windows', type: 'boolean', default: true },
        { key: 'shadowStrength', label: 'Shadow strength', type: 'number', default: 100, min: 0, max: 200, step: 1, unit: '%', dependsOn: { key: 'shadows', value: true } },
        { key: 'solidPopups', label: 'Solid popups', hint: 'Opaque menu backgrounds', type: 'boolean', default: false },
        { key: 'outlines', label: 'Outlines', type: 'select', default: 'original', choices: { original: 'Original', accent: 'Accent', none: 'None' } },
        { key: 'accentStyle', label: 'Accent style', type: 'select', default: 'accent', choices: { accent: 'Palette', neutral: 'Neutral' } },
        { key: 'panels', label: 'Panels', type: 'select', default: 'original', choices: { original: 'Original', tinted: 'Tinted' } },
        { key: 'panelTint', label: 'Panel tint', type: 'number', default: 20, min: 0, max: 50, step: 1, unit: '%', dependsOn: { key: 'panels', value: 'tinted' } },
    ];
    const effectKeys = [...patterns.map(({ key }) => key), ...effectControls.map(({ key }) => key)];

    function object(value, label, allowed) {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
        for (const key of Object.keys(value)) {
            if (!allowed.includes(key)) throw new Error(`Unknown ${label} option: ${key}`);
        }
        return value;
    }

    function font(value, label) {
        // Accept CSS font-family lists; reject declarations and URLs.
        const family = /^(?:"[^"\\;{}<>]+"|'[^'\\;{}<>]+'|-?[\p{L}_][\p{L}\p{N} _-]*)$/u;
        if (typeof value !== 'string' || value.length > 500 || /[\u0000-\u001f\u007f]/.test(value) || !value.split(',').every((item) => family.test(item.trim()))) {
            throw new Error(`${label} must be a comma-separated list of font family names.`);
        }
        return value.trim();
    }

    function options(input, fields, label) {
        object(input, label, fields.map(({ key }) => key));
        const result = {};
        for (const field of fields) {
            const value = Object.hasOwn(input, field.key) ? input[field.key] : field.default;
            if (field.type === 'boolean') {
                if (typeof value !== 'boolean') throw new Error(`${field.label} must be true or false.`);
            } else if (field.type === 'select') {
                if (typeof value !== 'string' || !Object.hasOwn(field.choices, value)) throw new Error(`Unknown ${field.label.toLowerCase()} option: ${value}`);
            } else if (!Number.isInteger(value) || value < field.min || value > field.max) {
                throw new Error(`${field.label} must be a whole number from ${field.min} to ${field.max}.`);
            }
            result[field.key] = value;
        }
        return result;
    }

    function normalize(input = {}) {
        object(input, 'configuration', ['variant', 'avatarShape', 'palette', 'colors', 'sizes', 'fonts', 'effects', 'effectValues', 'spotifast', 'googleFonts']);
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
            effects: Object.fromEntries([...patterns.map(({ key }) => [key, true]), ...effectControls.map(({ key, default: value }) => [key, value])]),
            effectValues: options(input.effectValues === undefined ? {} : input.effectValues, effectRanges, 'effect value'),
            spotifast: options(input.spotifast === undefined ? {} : input.spotifast, spotifastOptions, 'Spotifast'),
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
            object(input.effects, 'effect', [...effectKeys, 'textures']);
            for (const [key, value] of Object.entries(input.effects)) {
                if (typeof value !== 'boolean') throw new Error(`Effect ${key} must be true or false.`);
            }
            // Older settings used one "textures" switch for every pattern.
            if (Object.hasOwn(input.effects, 'textures')) {
                for (const { key } of patterns) result.effects[key] = input.effects.textures;
            }
            for (const key of effectKeys) {
                if (Object.hasOwn(input.effects, key)) result.effects[key] = input.effects[key];
            }
        }
        if (input.googleFonts !== undefined) {
            if (typeof input.googleFonts !== 'boolean') throw new Error('googleFonts must be true or false.');
            result.googleFonts = input.googleFonts;
        }
        return result;
    }

    function textureVariables(config) {
        const strength = config.effectValues.textureStrength / 100;
        const scale = config.effectValues.textureScale / 100;
        const px = (value) => `${Number((value * scale).toFixed(3))}px`;
        const alpha = (value) => Number(Math.min(1, value * strength).toFixed(4));
        const rgba = (hex) => `rgba(${hex.slice(1).match(/../g).map((value) => parseInt(value, 16)).join(', ')}, ${alpha(1)})`;
        return {
            '--r98-pat-scan': `repeating-linear-gradient(to bottom, rgba(255, 255, 255, ${alpha(.016)}) 0 ${px(1)}, transparent ${px(1)} ${px(3)})`,
            '--r98-pat-dither': `repeating-conic-gradient(rgba(255, 255, 255, ${alpha(.022)}) 0% 25%, transparent 0% 50%)`,
            '--r98-pat-dither-size': `${px(4)} ${px(4)}`,
            '--r98-pat-dots': `radial-gradient(rgba(255, 255, 255, ${alpha(.035)}) ${px(.75)}, transparent ${px(1)})`,
            '--r98-pat-dots-size': `${px(6)} ${px(6)}`,
            '--r98-pat-bar': `repeating-linear-gradient(to bottom, rgba(0, 0, 0, ${alpha(.1)}) 0 ${px(1)}, transparent ${px(1)} ${px(2)})`,
            '--r98-pat-scrollbar-track': `repeating-conic-gradient(${rgba(config.colors['bg-1'])} 0% 25%, ${rgba(config.colors['bg-0'])} 0% 50%)`,
            '--r98-pat-scrollbar-track-size': `${px(2)} ${px(2)}`,
            '--r98-pat-scrollbar-thumb': `repeating-linear-gradient(to bottom, ${rgba(config.colors['bevel-light'])} 0 ${px(1)}, ${rgba(config.colors['bevel-dark'])} ${px(1)} ${px(2)}, transparent ${px(2)} ${px(4)})`,
            '--r98-pat-scrollbar-thumb-size': `${px(6)} ${px(10)}`,
        };
    }

    function toVariables(input) {
        const config = normalize(input);
        const vars = Object.fromEntries(Object.entries(config.colors).map(([key, value]) => [`--r98-${key}`, value]));
        // Custom fills may switch between dark and light. Choose readable text for
        // each button state, trying palette colours before black or white.
        for (const role of ['accent', 'accent-hover', 'accent-active']) {
            vars[`--r98-on-${role}`] = [config.colors['text-1'], config.colors['bg-0'], '#ffffff', '#000000']
                .find((foreground) => contrast(foreground, config.colors[role]) >= 4.5);
        }
        vars['--r98-titlebar'] = config.effects.gradient
            ? `linear-gradient(to right, ${config.colors['titlebar-start']}, 75%, ${config.colors['titlebar-end']})`
            : config.colors['titlebar-start'];
        vars['--r98-avatar-radius'] = avatarShapes[config.avatarShape].radius;
        vars['--r98-font'] = config.fonts.ui;
        vars['--r98-font-code'] = config.fonts.code;
        for (const { key, variable } of sizes) vars[variable] = `${config.sizes[key]}px`;
        if (config.effectValues.textureStrength !== 100 || config.effectValues.textureScale !== 100) Object.assign(vars, textureVariables(config));
        for (const pattern of patterns) {
            if (!config.effects[pattern.key] || config.effectValues.textureStrength === 0) {
                for (const key of pattern.vars) vars[`--r98-pat-${key}`] = 'none';
            }
        }
        if (!config.effects.bevels) {
            vars['--r98-raised'] = 'none';
            vars['--r98-sunken'] = 'none';
            vars['--r98-toolbar-shadow'] = 'none';
        }
        if (!config.effects.shadows) vars['--r98-drop'] = 'none';
        else if (config.effectValues.shadowOffset !== 3) vars['--r98-drop'] = `${config.effectValues.shadowOffset}px ${config.effectValues.shadowOffset}px 0 rgba(0, 0, 0, 0.35)`;
        if (!config.effects.panelBorders) vars['--r98-panel-border-width'] = '0px';
        if (config.effects.messageDividers) vars['--r98-message-divider'] = '1px solid var(--r98-border)';
        if (config.effects.alternatingMessages) vars['--r98-message-alt-bg'] = config.colors['bg-1'];
        if (config.effects.textGlow) vars['--r98-text-glow'] = `0 0 ${config.effectValues.glowRadius}px ${config.colors['accent-light']}`;
        return vars;
    }

    function toCSS(input) {
        const config = normalize(input);
        let css = `:root {\n${Object.entries(toVariables(config)).map(([key, value]) => `    ${key}: ${value};`).join('\n')}\n}\n`;
        if (config.effects.messageDividers) css += '\n.chatContent_f75fb0 [id^="chat-messages-"] {\n    border-bottom: var(--r98-message-divider) !important;\n}\n';
        if (config.effects.alternatingMessages) css += '\n.chatContent_f75fb0 [id^="chat-messages-"]:nth-child(even):not([class*="mentioned_"]):not([class*="replying_"]) {\n    background-color: var(--r98-message-alt-bg) !important;\n}\n';
        if (config.effects.textGlow) css += '\n.chatContent_f75fb0 :is([class^="markup_"], [class*=" markup_"]),\n.bar_c38106 .title_c38106 {\n    text-shadow: var(--r98-text-glow) !important;\n}\n';
        return css;
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
        // Try black or white if palette text lacks contrast in either button state.
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
        const config = normalize(input);
        const { base, colors: c } = toPalette(config);
        const settings = config.spotifast;
        const opacity = (color, strength) => `${color.slice(0, 7)}${Math.min(255, Math.round(parseInt(color.slice(7), 16) * strength / 100)).toString(16).padStart(2, '0')}`;
        const blend = (first, second, amount) => `#${first.slice(1).match(/../g).map((value, index) => {
            const start = parseInt(value, 16), end = parseInt(second.slice(1 + index * 2, 3 + index * 2), 16);
            return Math.round(start + (end - start) * amount / 100).toString(16).padStart(2, '0');
        }).join('')}`;
        const gray = (color) => {
            const light = luminance(color);
            const value = Math.round((light <= .0031308 ? 12.92 * light : 1.055 * light ** (1 / 2.4) - .055) * 255).toString(16).padStart(2, '0');
            return `#${value.repeat(3)}`;
        };
        const neutral = settings.accentStyle === 'neutral';
        const accent = neutral ? [gray(c.textSecondary), gray(c.text), '#ffffff', '#000000'].find((color) => contrast(color, c.background) >= 4.5) : c.accent;
        const accentHover = neutral ? blend(accent, luminance(c.background) < .179 ? '#ffffff' : '#000000', 10) : c.accentHover;
        const onAccent = neutral
            ? [c.text, c.input, '#ffffff', '#000000'].find((text) => Math.min(contrast(text, accent), contrast(text, accentHover)) >= 4.5)
            : c.onAccent;
        return {
            base,
            colors: {
                window: c.background,
                panel: settings.panels === 'tinted' ? blend(c.panel, c.accent, settings.panelTint) : c.panel,
                surface: c.surface,
                surface_hover: c.surfaceHover,
                surface_active: c.selection,
                outline: settings.outlines === 'accent' ? c.accentFocus : settings.outlines === 'none' ? `${c.border}00` : c.border,
                text: c.text,
                secondary: c.textSecondary,
                dim: c.textMuted,
                accent,
                accent_hover: accentHover,
                on_accent: onAccent,
                danger: c.danger,
                warning: c.warning,
                overlay: settings.solidPopups ? `${c.input}ff` : c.overlay,
                shadow: opacity(c.shadow, settings.shadows ? settings.shadowStrength : 0),
                tint: opacity(c.tint, settings.tint ? settings.tintStrength : 0),
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

    return { colors, sizes, patterns, effectControls, effectRanges, spotifastOptions, palettes, paletteOptions, variants, avatarShapes, fontPresets, defaults: normalize(), normalize, toVariables, toCSS, toPalette, toSpotifast, encode, decode, command };
}));
