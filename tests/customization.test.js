const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const customization = require('../scripts/customization');

test('palette defaults are complete, isolated, and accept targeted overrides', () => {
    const original = customization.normalize();
    assert.equal(original.colors['bg-0'], '#1b1d1c');
    assert.equal(original.sizes.fontSize, 16);
    assert.equal(original.googleFonts, true);
    for (const palette of ['pine', 'blue', 'plum', 'amber']) {
        const config = customization.normalize({ palette, colors: { accent: '#ABCDEF' } });
        assert.equal(Object.keys(config.colors).length, customization.colors.length);
        assert.equal(config.colors.accent, '#abcdef');
        assert.equal(config.colors['bg-0'], customization.palettes[palette].colors['bg-0']);
    }
    original.colors['bg-0'] = '#ffffff';
    original.sizes.fontSize = 24;
    assert.equal(customization.normalize().colors['bg-0'], '#1b1d1c');
    assert.equal(customization.normalize().sizes.fontSize, 16);
    const appleFonts = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    assert.equal(customization.normalize({ fonts: { ui: appleFonts } }).fonts.ui, appleFonts);
});

test('size boundaries and effect switches produce usable CSS variables', () => {
    const config = customization.normalize({
        sizes: { fontSize: 12, codeSize: 24, messageSpacing: 0, sidebarWidth: 360, memberWidth: 180, radius: 16, scrollbarWidth: 8 },
        effects: { textures: false, bevels: false, shadows: false },
        googleFonts: false,
    });
    const variables = customization.toVariables(config);
    assert.equal(variables['--r98-font-size'], '12px');
    assert.equal(variables['--r98-sidebar-width'], '360px');
    assert.equal(variables['--r98-message-spacing'], '0px');
    for (const key of ['--r98-pat-scan', '--r98-pat-dither', '--r98-pat-dots', '--r98-pat-bar', '--r98-pat-scrollbar-track', '--r98-pat-scrollbar-thumb', '--r98-raised', '--r98-sunken', '--r98-toolbar-shadow', '--r98-drop']) {
        assert.equal(variables[key], 'none', key);
    }
    assert.match(customization.toCSS(config), /--r98-radius: 16px;/);
    assert.equal(customization.toVariables({})['--r98-drop'], undefined, 'enabled effects retain the source theme definitions');
});

test('untrusted configuration cannot add CSS declarations or unsupported settings', () => {
    const invalid = [
        null, [], { palette: '__proto__' }, { palette: 'unknown' }, { output: 'theme.css' },
        JSON.parse('{"__proto__":{"polluted":true}}'),
        { colors: { unknown: '#000000' } }, { colors: { accent: '#fff' } },
        { colors: { accent: '#000000; color: red' } }, { colors: { accent: 'url(https://example.com)' } },
        { fonts: { ui: 'Arial; color: red' } }, { fonts: { ui: "'Arial'}body{display:none}" } },
        { fonts: { ui: "'Arial'</style><script>" } }, { fonts: { ui: 'url(https://example.com/font)' } },
        { fonts: { ui: "'Arial\\27'" } }, { fonts: { ui: 'Arial\nserif' } }, { fonts: { ui: '' } },
        { fonts: { ui: "'Arial\fFont'" } }, { fonts: { ui: "'Arial\u0000Font'" } }, { fonts: { ui: "'Arial\u007fFont'" } },
        { fonts: { missing: 'Arial' } }, { sizes: { fontSize: '16' } }, { sizes: { fontSize: 11 } },
        { sizes: { fontSize: 25 } }, { sizes: { radius: 0.5 } }, { sizes: { radius: NaN } },
        { sizes: { radius: Infinity } }, { sizes: { messageSpacing: -1 } }, { sizes: { scale: 2 } },
        { effects: { textures: 'false' } }, { effects: { shadows: 0 } }, { effects: { glow: true } },
        { googleFonts: 'false' }, { googleFonts: null },
    ];
    for (const config of invalid) assert.throws(() => customization.normalize(config), undefined, JSON.stringify(config));
    assert.equal({}.polluted, undefined);
});

test('browser and Node encode Unicode fonts identically and reject damaged payloads', () => {
    const context = vm.createContext({ TextEncoder, TextDecoder, btoa, atob });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../scripts/customization.js'), 'utf8'), context);
    const browser = context.Relay98Customization;
    const config = { palette: 'plum', fonts: { ui: "'日本語のフォント', 'Știință', sans-serif", code: "'Код', monospace" } };
    const encoded = customization.encode(config);
    assert.equal(browser.encode(config), encoded);
    assert.deepEqual(customization.decode(browser.encode(config)), customization.normalize(config));
    assert.equal(JSON.stringify(browser.decode(encoded)), JSON.stringify(customization.normalize(config)));
    assert.match(customization.command(config), /^npm run build -- --custom [A-Za-z0-9_-]+$/);

    const damagedUtf8 = Buffer.concat([Buffer.from('{"fonts":{"ui":"\''), Buffer.from([0xff]), Buffer.from("', serif\"}}")]).toString('base64url');
    for (const payload of ['', 'a', 'a=', '%%%not-base64', 'a'.repeat(32769), Buffer.from('{').toString('base64url'), damagedUtf8]) {
        assert.throws(() => customization.decode(payload), undefined, payload.slice(0, 30));
        assert.throws(() => browser.decode(payload), undefined, payload.slice(0, 30));
    }
});

test('generated Bash command compiles settings without executing font text', (t) => {
    const { spawnSync } = require('node:child_process');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'relay98-command-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const marker = path.join(directory, 'must-not-exist');
    const output = path.join(directory, 'custom.theme.css');
    const ui = `'$(touch ${marker})', '\`touch ${marker}\`', sans-serif`;
    const command = customization.command({ palette: 'blue', fonts: { ui }, sizes: { fontSize: 19 }, googleFonts: false });
    const quote = (value) => `'${value.replace(/'/g, "'\\''")}'`;
    // Inherit npm's working PATH; login startup files can replace it (for example
    // nvm rejects npm_config_prefix inside an npm lifecycle process).
    const result = spawnSync('bash', ['-c', `${command} --output ${quote(output)}`], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.existsSync(marker), false);
    const css = fs.readFileSync(output, 'utf8');
    assert.ok(css.includes(`--r98-font: ${ui};`));
    assert.ok(css.includes('--r98-font-size: 19px;'));
    assert.ok(css.includes('--r98-bg-0: #171c25;'));
    assert.doesNotMatch(css, /@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com/);
});
