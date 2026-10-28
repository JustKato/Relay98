const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { build, parseArgs } = require('../scripts/build');
const customization = require('../scripts/customization');

test('portable palettes include every shade without application settings', () => {
    for (const name of Object.keys(customization.palettes)) {
        const config = customization.normalize({ palette: name });
        const palette = customization.toPalette(config);
        assert.deepEqual(Object.keys(palette), ['base', 'colors']);
        assert.equal(palette.base, 'dark');
        for (const value of Object.values(config.colors)) assert.ok(Object.values(palette.colors).includes(value), `${name}: missing ${value}`);
        for (const value of Object.values(palette.colors)) assert.match(value, /^#[\da-f]{6}([\da-f]{2})?$/);
        assert.equal(palette.colors.background, config.colors['bg-2']);
        assert.equal(palette.colors.textBody, config.colors['text-2']);
        assert.equal(palette.colors.textFaint, config.colors['text-5']);
        assert.equal(palette.colors.success, config.colors.green);
        assert.equal(palette.colors.overlay, `${config.colors['bg-0']}80`);
        assert.equal(palette.colors.shadow, `${config.colors['bevel-dark']}66`);
        assert.deepEqual(customization.toPalette({ ...config, fonts: { ui: 'Arial' }, sizes: { fontSize: 24 }, effects: { shadows: false }, googleFonts: false }), palette);
    }
});

test('accent text accounts for hover and recovers from low-contrast custom colours', () => {
    const hover = customization.toPalette({ colors: { 'text-1': '#ffffff', 'bg-0': '#000000', accent: '#666666', 'accent-hover': '#cccccc' } });
    assert.equal(hover.colors.onAccent, '#000000');
    const flat = customization.toPalette({ colors: { 'text-1': '#777777', 'bg-0': '#777777', accent: '#777777', 'accent-hover': '#777777' } });
    assert.equal(flat.colors.onAccent, '#000000');
    const bright = customization.toPalette({ colors: { 'text-1': '#000000', 'bg-0': '#000000', accent: '#000000', 'accent-hover': '#000000', 'bg-2': '#ffffff' } });
    assert.equal(bright.base, 'light');
    assert.equal(bright.colors.onAccent, '#ffffff');
});

test('portable CLI export accepts the same settings and output options', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'relay98-palette-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const output = path.join(directory, 'palette.json');
    const config = { palette: 'blue', colors: { green: '#123456', 'bg-0': '#102030', 'bevel-dark': '#050a0f' } };
    const result = build({ ...parseArgs(['--format', 'palette', '--custom', customization.encode(config), '--output', output]), quiet: true });
    assert.deepEqual(JSON.parse(fs.readFileSync(output, 'utf8')), customization.toPalette(config));
    assert.equal(result.theme.colors.success, '#123456');
    assert.equal(result.theme.colors.overlay, '#10203080');
    assert.equal(result.theme.colors.shadow, '#050a0f66');
    assert.equal(build({ format: 'palette', custom: config, output, quiet: true }).changed, false);
    assert.throws(() => build({ format: 'palette', output: path.join(directory, 'bad.css'), quiet: true }), /end in \.json/);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname, '../build/relay98.palette.json'), 'utf8')), customization.toPalette());
});
