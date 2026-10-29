const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const api = require('../scripts/customization');
const { build, parseArgs } = require('../scripts/build');

test('versions supply defaults while palette and avatar choices remain independent', () => {
    assert.deepEqual(api.paletteOptions, ['pine', 'discord']);
    assert.equal(api.normalize().avatarShape, 'square');
    const dark = api.normalize({ variant: 'discord' });
    assert.equal(dark.palette, 'discord');
    assert.equal(dark.avatarShape, 'round');
    assert.equal(dark.colors['bg-2'], '#1a1a1e');
    const mixed = api.normalize({ variant: 'discord', palette: 'pine', avatarShape: 'square' });
    assert.equal(mixed.colors['bg-2'], api.defaults.colors['bg-2']);
    assert.equal(mixed.avatarShape, 'square');
    assert.equal(api.toVariables({ avatarShape: 'round', sizes: { radius: 6 } })['--r98-avatar-radius'], '50%');
    assert.equal(api.toVariables({ avatarShape: 'square', sizes: { radius: 6 } })['--r98-avatar-radius'], '0px');
    assert.deepEqual(api.decode(api.encode(dark)), dark);
    assert.deepEqual(api.toSpotifast({ palette: 'discord', avatarShape: 'square' }), api.toSpotifast(dark));
});

test('old settings still load and invalid version and shape choices are rejected', () => {
    for (const palette of ['pine', 'blue', 'plum', 'amber']) {
        assert.equal(api.normalize({ palette }).avatarShape, 'square');
    }
    for (const value of [null, '__proto__', 'missing', 5]) {
        assert.throws(() => api.normalize({ variant: value }), /theme version/);
        assert.throws(() => api.normalize({ avatarShape: value }), /avatar shape/);
    }
    assert.throws(() => parseArgs(['--variant', 'missing']), /theme version/);
    assert.throws(() => parseArgs(['--variant', 'discord', '--custom', api.encode({})]), /only one/);
});

test('the darker version builds as a separate installable theme', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'relay98-variant-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const result = build({ variant: 'discord', output: path.join(directory, 'dark.css'), quiet: true });
    assert.match(result.css, /@name Relay98 Discord Dark/);
    assert.match(result.css, /--r98-avatar-radius: 50%;/);
    assert.match(result.css, /--r98-bg-2: #1a1a1e;/);
    assert.equal(result.css, fs.readFileSync(path.join(__dirname, '../build/relay98-discord-dark.theme.css'), 'utf8'));
});
