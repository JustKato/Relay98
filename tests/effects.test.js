const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const api = require('../scripts/customization');

test('new controls preserve the original exports and leave extra effects off', () => {
    const config = api.normalize();
    assert.deepEqual(config.effects, {
        scanlines: true, dots: true, dither: true, stripes: true, scrollbar: true,
        bevels: true, shadows: true, gradient: true, panelBorders: true,
        messageDividers: false, alternatingMessages: false, textGlow: false,
    });
    assert.deepEqual(config.effectValues, { textureStrength: 100, textureScale: 100, shadowOffset: 3, glowRadius: 2 });
    const expected = Object.fromEntries(Object.entries(config.colors).map(([key, value]) => [`--r98-${key}`, value]));
    Object.assign(expected, {
        '--r98-on-accent': '#ffffff', '--r98-on-accent-hover': '#000000', '--r98-on-accent-active': '#eef0ec',
        '--r98-titlebar': 'linear-gradient(to right, #2e4a3b, 75%, #5b8360)',
        '--r98-avatar-radius': '0px', '--r98-font': config.fonts.ui, '--r98-font-code': config.fonts.code,
    });
    for (const { key, variable } of api.sizes) expected[variable] = `${config.sizes[key]}px`;
    assert.deepEqual(api.toVariables(), expected);
    assert.equal(api.toCSS(), `:root {\n${Object.entries(expected).map(([key, value]) => `    ${key}: ${value};`).join('\n')}\n}\n`);
    for (const [format, method] of [['spotifast', 'toSpotifast'], ['palette', 'toPalette']]) {
        const original = JSON.parse(fs.readFileSync(path.join(__dirname, `../build/relay98.${format}.json`), 'utf8'));
        assert.deepEqual(api[method](), original);
    }
    assert.equal(api.toSpotifast().colors.tint, '#2e4a3b28');
    assert.equal(api.toSpotifast().colors.shadow, '#12141366');
    assert.equal(api.toSpotifast().colors.overlay, '#1b1d1c80');
});

test('old settings fill new defaults without enabling extra effects', () => {
    const config = api.normalize({ effects: { textures: false, dither: true, shadows: false } });
    for (const { key } of api.patterns) assert.equal(config.effects[key], key === 'dither');
    assert.equal(config.effects.shadows, false);
    assert.equal(config.effects.gradient, true);
    for (const key of ['messageDividers', 'alternatingMessages', 'textGlow']) assert.equal(config.effects[key], false);
    assert.deepEqual(config.effectValues, api.defaults.effectValues);
    assert.deepEqual(config.spotifast, api.defaults.spotifast);
    assert.deepEqual(api.decode(api.encode(config)), config);
});

test('effect settings survive JSON and command round trips', () => {
    const config = api.normalize({
        palette: 'diskette',
        effects: { gradient: false, panelBorders: false, messageDividers: true, alternatingMessages: true, textGlow: true },
        effectValues: { textureStrength: 125, textureScale: 170, shadowOffset: 7, glowRadius: 6 },
        spotifast: { tint: false, tintStrength: 80, shadows: false, shadowStrength: 60, solidPopups: true, outlines: 'accent', accentStyle: 'neutral', panels: 'tinted', panelTint: 35 },
    });
    assert.deepEqual(api.normalize(JSON.parse(JSON.stringify(config))), config);
    assert.deepEqual(api.decode(api.command(config).split(' ').at(-1)), config);
    const copy = api.normalize(config);
    copy.effectValues.textureStrength = 0;
    copy.spotifast.panels = 'original';
    assert.equal(config.effectValues.textureStrength, 125);
    assert.equal(config.spotifast.panels, 'tinted');
});

test('texture strength and scale affect real patterns while switches take precedence', () => {
    const vars = api.toVariables({ effectValues: { textureStrength: 200, textureScale: 150 } });
    assert.match(vars['--r98-pat-scan'], /0\.032\) 0 1\.5px, transparent 1\.5px 4\.5px/);
    assert.equal(vars['--r98-pat-dither-size'], '6px 6px');
    assert.equal(vars['--r98-pat-dots-size'], '9px 9px');
    assert.match(vars['--r98-pat-dots'], /0\.07\) 1\.125px, transparent 1\.5px/);
    assert.match(vars['--r98-pat-bar'], /0\.2\) 0 1\.5px/);
    assert.match(vars['--r98-pat-scrollbar-thumb'], /transparent 3px 6px/);
    assert.equal(vars['--r98-pat-scrollbar-track-size'], '3px 3px');
    assert.equal(vars['--r98-pat-scrollbar-thumb-size'], '9px 15px');
    for (const input of [
        { effectValues: { textureStrength: 0, textureScale: 150 } },
        { effects: { textures: false }, effectValues: { textureStrength: 200, textureScale: 150 } },
    ]) {
        const off = api.toVariables(input);
        for (const pattern of api.patterns) for (const key of pattern.vars) assert.equal(off[`--r98-pat-${key}`], 'none');
    }
    const oneOff = api.toVariables({ effects: { dots: false }, effectValues: { textureStrength: 50 } });
    assert.equal(oneOff['--r98-pat-dots'], 'none');
    assert.match(oneOff['--r98-pat-scan'], /0\.008/);
});

test('Discord surface controls remain independent', () => {
    const vars = api.toVariables({ effects: { gradient: false, panelBorders: false }, effectValues: { shadowOffset: 8 } });
    assert.equal(vars['--r98-titlebar'], '#2e4a3b');
    assert.equal(vars['--r98-panel-border-width'], '0px');
    assert.equal(vars['--r98-drop'], '8px 8px 0 rgba(0, 0, 0, 0.35)');
    assert.equal(vars['--r98-pat-bar'], undefined, 'flat title bars can retain their stripes');
    const off = api.toVariables({ effects: { shadows: false }, effectValues: { shadowOffset: 8 } });
    assert.equal(off['--r98-drop'], 'none');
});

test('Discord extras emit scoped CSS only when enabled', () => {
    const input = { effects: { messageDividers: true, alternatingMessages: true, textGlow: true }, effectValues: { glowRadius: 5 } };
    const vars = api.toVariables(input);
    assert.equal(vars['--r98-message-divider'], '1px solid var(--r98-border)');
    assert.equal(vars['--r98-message-alt-bg'], api.defaults.colors['bg-1']);
    assert.equal(vars['--r98-text-glow'], '0 0 5px #7fae86');
    const css = api.toCSS(input);
    assert.match(css, /\.chatContent_f75fb0 \[id\^="chat-messages-"\] \{\n    border-bottom: var\(--r98-message-divider\)/);
    assert.match(css, /:nth-child\(even\):not\(\[class\*="mentioned_"\]\):not\(\[class\*="replying_"\]\)/);
    assert.match(css, /\.bar_c38106 \.title_c38106 \{\n    text-shadow: var\(--r98-text-glow\)/);
    assert.doesNotMatch(api.toCSS(), /chat-messages-|text-shadow:/);
    assert.doesNotMatch(api.toCSS({ effects: { messageDividers: true } }), /nth-child|text-shadow:/);
    assert.doesNotMatch(css, /\bbody\s*\{/);
});

test('Spotifast effects alter only supported colour roles', () => {
    const original = api.toSpotifast();
    const disabled = api.toSpotifast({ spotifast: { tint: false, shadows: false, outlines: 'none' } });
    assert.equal(disabled.colors.tint, '#2e4a3b00');
    assert.equal(disabled.colors.shadow, '#12141300');
    assert.equal(disabled.colors.outline, '#3a3f3c00');
    assert.deepEqual(Object.keys(disabled.colors), Object.keys(original.colors));
    assert.deepEqual(Object.keys(disabled), ['base', 'colors']);
    const stronger = api.toSpotifast({ spotifast: { tintStrength: 200, shadowStrength: 200, solidPopups: true, outlines: 'accent' } });
    assert.equal(stronger.colors.tint, '#2e4a3b50');
    assert.equal(stronger.colors.shadow, '#121413cc');
    assert.equal(stronger.colors.overlay, '#1b1d1cff');
    assert.equal(stronger.colors.outline, '#7fae86');
    assert.equal(api.toSpotifast({ spotifast: { tint: false, tintStrength: 200 } }).colors.tint, '#2e4a3b00');
    assert.equal(api.toSpotifast({ spotifast: { shadows: false, shadowStrength: 200 } }).colors.shadow, '#12141300');
});

test('Spotifast panel and neutral colour choices follow edited palette colours', () => {
    const input = { colors: { 'bg-1': '#000000', accent: '#ffffff', 'bg-3': '#112233', 'bg-4': '#223344', 'text-1': '#eeeeee', 'text-3': '#999999' } };
    const theme = api.toSpotifast({ ...input, spotifast: { panels: 'tinted', panelTint: 50, accentStyle: 'neutral' } });
    assert.equal(theme.colors.panel, '#808080');
    assert.equal(theme.colors.accent, '#999999');
    assert.equal(theme.colors.accent_hover, '#a3a3a3');
    assert.equal(theme.colors.on_accent, '#1b1d1c');
    assert.equal(api.toSpotifast({ ...input, spotifast: { panels: 'tinted', panelTint: 0 } }).colors.panel, '#000000');
    assert.equal(api.toSpotifast({ ...input, spotifast: { panelTint: 50 } }).colors.panel, '#000000');
});

test('neutral Spotifast accents remain readable as labels and button fills', () => {
    const luminance = (hex) => hex.slice(1).match(/../g)
        .map((value) => parseInt(value, 16) / 255)
        .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const ratio = (a, b) => {
        const values = [luminance(a), luminance(b)].sort((left, right) => left - right);
        return (values[1] + .05) / (values[0] + .05);
    };
    const inputs = api.paletteOptions.map((palette) => ({ palette }));
    inputs.push({ colors: { 'bg-2': '#ffffff', 'text-1': '#eeeeee', 'text-3': '#dddddd' } });
    for (const input of inputs) {
        const { colors: c } = api.toSpotifast({ ...input, spotifast: { accentStyle: 'neutral' } });
        assert.match(c.accent, /^#([0-9a-f]{2})\1\1$/);
        assert.ok(ratio(c.accent, c.window) >= 4.5, 'accent labels on the window');
        assert.ok(ratio(c.on_accent, c.accent) >= 4.5, 'button labels');
        assert.ok(ratio(c.on_accent, c.accent_hover) >= 4.5, 'hovered button labels');
    }
});

test('each app ignores the other app controls, and palette exports ignore both', () => {
    const discord = { effects: { textures: false, bevels: false, gradient: false, messageDividers: true, textGlow: true }, effectValues: { textureStrength: 200, shadowOffset: 6, glowRadius: 7 } };
    const spotifast = { spotifast: { tint: false, shadows: false, solidPopups: true, outlines: 'none', accentStyle: 'neutral', panels: 'tinted' } };
    assert.deepEqual(api.toSpotifast(discord), api.toSpotifast());
    assert.deepEqual(api.toVariables(spotifast), api.toVariables());
    assert.equal(api.toCSS(spotifast), api.toCSS());
    assert.deepEqual(api.toPalette({ ...discord, ...spotifast }), api.toPalette());
});

test('effect controls reject invalid types, ranges and undeclared choices', () => {
    for (const input of [
        { effectValues: null }, { effectValues: [] }, { effectValues: { speed: 2 } },
        { effectValues: { textureStrength: -1 } }, { effectValues: { textureStrength: 201 } },
        { effectValues: { textureScale: 49 } }, { effectValues: { textureScale: Infinity } },
        { effectValues: { shadowOffset: 9 } }, { effectValues: { shadowOffset: 2.5 } },
        { effectValues: { glowRadius: 0 } }, { effectValues: { glowRadius: '2' } },
        { effects: { gradient: 'false' } }, { effects: { messageDividers: 1 } },
        { spotifast: null }, { spotifast: [] }, { spotifast: { accent_from_art: false } },
        { spotifast: { outlines: '__proto__' } }, { spotifast: { accentStyle: 'white; color:red' } },
        { spotifast: { panels: true } }, { spotifast: { tint: 0 } },
        { spotifast: { tintStrength: NaN } }, { spotifast: { shadowStrength: 201 } },
        { spotifast: { panelTint: 51 } }, { spotifast: { panelTint: -1 } },
        JSON.parse('{"spotifast":{"__proto__":{"polluted":true}}}'),
    ]) assert.throws(() => api.normalize(input), undefined, JSON.stringify(input));
    assert.equal({}.polluted, undefined);
});
