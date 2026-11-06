const assert = require('node:assert/strict');
const test = require('node:test');
const api = require('../scripts/customization');

const offered = ['pine', 'carbon', 'copper', 'diskette', 'tidepool', 'oxblood', 'sandstone', 'afterglow', 'slate', 'amberglass', '2004'];
const legacy = ['discord', 'blue', 'plum', 'amber'];

function contrast(first, second) {
    const luminance = (hex) => {
        const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255)
            .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const a = luminance(first), b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('the accent collection starts with default Pine and ten distinct additions', () => {
    assert.deepEqual(api.paletteOptions, offered);
    assert.equal(new Set(offered).size, 11);
    assert.equal(api.defaults.palette, 'pine');
    assert.deepEqual(api.palettes.pine.colors, Object.fromEntries(api.colors.map(({ key, default: value }) => [key, value])));
    assert.equal(new Set(offered.map((id) => api.palettes[id].colors.accent)).size, offered.length);
    assert.equal(new Set(offered.map((id) => api.palettes[id].colors['bg-2'])).size, offered.length);
    for (const id of offered) {
        const { colors } = api.palettes[id];
        assert.deepEqual(Object.keys(colors).sort(), api.colors.map(({ key }) => key).sort(), id);
        for (const [role, color] of Object.entries(colors)) assert.match(color, /^#[0-9a-f]{6}$/, `${id}: ${role}`);
    }
    for (const id of legacy) assert.ok(!api.paletteOptions.includes(id), id);
});

test('Pine faint text remains readable on every surface', () => {
    const c = api.defaults.colors;
    for (const surface of ['bg-0', 'bg-1', 'bg-2', 'bg-3', 'bg-4']) {
        assert.ok(contrast(c['text-5'], c[surface]) >= 4.5, surface);
    }
});

test('every accent survives saved settings with custom controls intact', () => {
    for (const palette of offered) {
        const settings = api.normalize({
            palette, avatarShape: 'round', sizes: { fontSize: 18, sidebarWidth: 280 },
            fonts: { ui: "'Tahoma', sans-serif", code: "'Courier New', monospace" },
            effects: { scanlines: false, bevels: false }, googleFonts: false,
            colors: { red: '#c84b45' },
        });
        const loaded = api.decode(api.encode(settings));
        assert.deepEqual(loaded, settings, palette);
        assert.equal(loaded.colors.accent, api.palettes[palette].colors.accent);
        assert.equal(loaded.colors.red, '#c84b45');
        assert.deepEqual(api.normalize(loaded), loaded);
    }
});

test('accent exports preserve colors in CSS, portable palettes, and Spotifast', () => {
    for (const palette of offered) {
        const settings = api.normalize({ palette });
        const portable = api.toPalette(settings);
        const spotifast = api.toSpotifast(settings);
        const variables = api.toVariables(settings);
        const css = api.toCSS(settings);
        assert.equal(portable.base, 'dark', palette);
        assert.equal(spotifast.base, 'dark', palette);
        for (const [role, color] of Object.entries(settings.colors)) {
            assert.equal(variables[`--r98-${role}`], color, `${palette}: ${role}`);
            assert.ok(css.includes(`--r98-${role}: ${color};`), `${palette}: ${role}`);
            assert.ok(Object.values(portable.colors).includes(color), `${palette}: ${role}`);
        }
        assert.equal(spotifast.colors.accent, settings.colors.accent, palette);
        assert.equal(spotifast.colors.window, settings.colors['bg-2'], palette);
        assert.equal(spotifast.colors.on_accent, portable.colors.onAccent, palette);
        assert.deepEqual(JSON.parse(JSON.stringify(portable)), portable);
        assert.deepEqual(JSON.parse(JSON.stringify(spotifast)), spotifast);
    }
});

test('new accents keep text readable across surfaces and selected rows', () => {
    for (const palette of offered.slice(1)) {
        const c = api.palettes[palette].colors;
        for (const surface of ['bg-0', 'bg-1', 'bg-2', 'bg-3', 'bg-4', 'select']) {
            for (const text of ['text-1', 'text-2', 'link']) {
                const ratio = contrast(c[text], c[surface]);
                assert.ok(ratio >= 4.5, `${palette}: ${text} on ${surface} is ${ratio.toFixed(2)}:1`);
            }
            assert.ok(contrast(c['text-3'], c[surface]) >= 3, `${palette}: secondary text on ${surface}`);
        }
        for (const surface of ['titlebar-start', 'titlebar-end']) {
            assert.ok(contrast(c['text-1'], c[surface]) >= 4.5, `${palette}: title text on ${surface}`);
        }
        const { onAccent } = api.toPalette({ palette }).colors;
        for (const surface of ['accent', 'accent-hover']) {
            assert.ok(contrast(onAccent, c[surface]) >= 4.5, `${palette}: button label on ${surface}`);
        }
    }
});

test('2004 retains Steam olive surfaces, mustard accents, and hard bevels', () => {
    const c = api.normalize({ palette: '2004' }).colors;
    assert.equal(c['bg-0'], '#3e4637');
    assert.equal(c['bg-2'], '#4c5844');
    assert.equal(c['bg-4'], '#5a6a50');
    assert.equal(c.accent, '#958831');
    assert.equal(c['accent-light'], '#c4b550');
    assert.equal(c['bevel-light'], '#889180');
    assert.equal(c['bevel-dark'], '#282e22');
});

test('derived button foregrounds meet contrast for every palette and state', () => {
    for (const palette of Object.keys(api.palettes)) {
        const settings = api.normalize({ palette });
        const variables = api.toVariables(settings);
        for (const role of ['accent', 'accent-hover', 'accent-active']) {
            const foreground = variables[`--r98-on-${role}`];
            assert.ok(contrast(foreground, settings.colors[role]) >= 4.5, `${palette}: ${role}`);
            assert.ok(api.toCSS(settings).includes(`--r98-on-${role}: ${foreground};`));
            if (contrast(settings.colors['text-1'], settings.colors[role]) >= 4.5) {
                assert.equal(foreground, settings.colors['text-1'], `${palette}: preserve readable text`);
            }
        }
        assert.deepEqual(settings.colors, api.palettes[palette].colors);
    }
    assert.equal(api.toVariables({ palette: '2004' })['--r98-on-accent'], '#000000');
    assert.ok(!api.colors.some(({ key }) => key.startsWith('on-accent')));
});

test('custom button fills derive readable foregrounds independently of each other', () => {
    const colors = { 'text-1': '#777777', 'bg-0': '#777777', accent: '#eeeeee', 'accent-hover': '#111111', 'accent-active': '#888888' };
    const variables = api.toVariables({ colors });
    assert.equal(variables['--r98-on-accent'], '#000000');
    assert.equal(variables['--r98-on-accent-hover'], '#ffffff');
    assert.equal(variables['--r98-on-accent-active'], '#000000');
    for (const role of ['accent', 'accent-hover', 'accent-active']) {
        assert.ok(contrast(variables[`--r98-on-${role}`], colors[role]) >= 4.5);
        assert.equal(variables[`--r98-${role}`], colors[role]);
    }
});

test('hidden legacy palettes and variant defaults still load from saved settings', () => {
    const backgrounds = { discord: '#1a1a1e', blue: '#252e3e', plum: '#332838', amber: '#342d23' };
    for (const palette of legacy) {
        const settings = api.normalize({ palette });
        assert.equal(settings.colors['bg-2'], backgrounds[palette]);
        assert.deepEqual(api.decode(api.encode(settings)), settings);
    }
    const discord = api.normalize({ variant: 'discord' });
    assert.equal(discord.palette, 'discord');
    assert.equal(discord.avatarShape, 'round');
    assert.equal(api.normalize().variant, 'original');
    assert.equal(api.normalize().avatarShape, 'square');
});
