const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const test = require('node:test');
const vm = require('node:vm');
const customization = require('../scripts/customization');
const { build, parseArgs, watch } = require('../scripts/build');

const root = path.join(__dirname, '..');

function temporary(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'relay98-spotifast-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}

test('every preset exports only supported Spotifast roles with matching colours', () => {
    const roles = ['window', 'panel', 'surface', 'surface_hover', 'surface_active', 'outline', 'text', 'secondary', 'dim', 'accent', 'accent_hover', 'on_accent', 'danger', 'warning', 'overlay', 'shadow', 'tint'];
    for (const palette of Object.keys(customization.palettes)) {
        const config = customization.normalize({ palette });
        const theme = customization.toSpotifast(config);
        assert.deepEqual(Object.keys(theme), ['base', 'colors']);
        assert.equal(theme.base, 'dark');
        assert.deepEqual(Object.keys(theme.colors), roles);
        for (const value of Object.values(theme.colors)) assert.match(value, /^#[\da-f]{6}([\da-f]{2})?$/);
        assert.equal(theme.colors.window, config.colors['bg-2']);
        assert.equal(theme.colors.panel, config.colors['bg-1']);
        assert.equal(theme.colors.accent, config.colors.accent);
        assert.equal(theme.colors.surface_active, config.colors.select);
        assert.equal(theme.colors.danger, config.colors.red);
        assert.equal(theme.colors.warning, config.colors.amber);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'build/relay98.spotifast.json'), 'utf8')), customization.toSpotifast());
});

test('colour overrides select the base and readable palette text independently of Discord settings', () => {
    const input = { colors: { 'bg-2': '#ffffff', 'bg-0': '#101010', 'text-1': '#fafafa', accent: '#eeeeee', 'titlebar-start': '#ABCDEF' } };
    const theme = customization.toSpotifast(input);
    assert.equal(theme.base, 'light');
    assert.equal(theme.colors.window, '#ffffff');
    assert.equal(theme.colors.on_accent, '#101010');
    assert.equal(theme.colors.tint, '#abcdef28');
    assert.equal(customization.toSpotifast({ colors: { ...input.colors, accent: '#000000', 'bg-2': '#000000' } }).colors.on_accent, '#fafafa');
    assert.deepEqual(customization.toSpotifast({ ...input, sizes: { fontSize: 24 }, fonts: { ui: 'Arial' }, effects: { textures: false, shadows: false }, googleFonts: false }), theme);
    assert.throws(() => customization.toSpotifast({ colors: { accent: '#fff' } }), /six-digit/);

    const context = vm.createContext({});
    vm.runInContext(fs.readFileSync(path.join(root, 'scripts/customization.js'), 'utf8'), context);
    assert.equal(JSON.stringify(context.Relay98Customization.toSpotifast(input)), JSON.stringify(theme));
});

test('Spotifast builds use separate defaults and preserve unchanged files', (t) => {
    const directory = temporary(t);
    fs.mkdirSync(path.join(directory, 'scripts'));
    fs.mkdirSync(path.join(directory, 'src'));
    for (const name of ['build.js', 'customization.js']) fs.copyFileSync(path.join(root, 'scripts', name), path.join(directory, 'scripts', name));
    fs.copyFileSync(path.join(root, 'package.json'), path.join(directory, 'package.json'));
    const isolatedBuild = require(path.join(directory, 'scripts/build.js')).build;
    const original = isolatedBuild({ format: 'spotifast', quiet: true });
    assert.equal(original.output, path.join(directory, 'build/relay98.spotifast.json'));
    assert.deepEqual(JSON.parse(original.json), customization.toSpotifast());
    assert.equal(original.changed, true);
    fs.utimesSync(original.output, 1, 1);
    const before = fs.statSync(original.output, { bigint: true });
    assert.equal(isolatedBuild({ format: 'spotifast', quiet: true }).changed, false);
    assert.equal(fs.statSync(original.output, { bigint: true }).mtimeNs, before.mtimeNs);
    const custom = isolatedBuild({ format: 'spotifast', custom: { palette: 'blue' }, quiet: true });
    assert.equal(custom.output, path.join(directory, 'build/relay98-custom.spotifast.json'));
    assert.equal(custom.theme.colors.window, '#252e3e');
    assert.equal(fs.readFileSync(original.output, 'utf8'), original.json);
    assert.equal(fs.existsSync(path.join(directory, 'build/relay98.theme.css')), false);
});

test('CLI settings and encoded settings export identical Spotifast JSON', (t) => {
    const directory = temporary(t);
    const configPath = path.join(directory, 'settings.json');
    const config = { palette: 'plum', colors: { accent: '#123456', 'bg-2': '#18293a' } };
    fs.writeFileSync(configPath, JSON.stringify(config));
    const outputs = ['from-config.json', 'from-token.json'].map((name) => path.join(directory, name));
    for (const [index, args] of [['--config', configPath], ['--custom', customization.encode(config)]].entries()) {
        const result = spawnSync(process.execPath, [path.join(root, 'scripts/build.js'), '--format', 'spotifast', ...args, '--output', outputs[index]], { encoding: 'utf8' });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
    }
    const json = fs.readFileSync(outputs[0], 'utf8');
    assert.equal(fs.readFileSync(outputs[1], 'utf8'), json);
    assert.deepEqual(JSON.parse(json), customization.toSpotifast(config));
    assert.ok(Buffer.byteLength(json) < 65536);
    assert.ok(json.endsWith('\n'));
});

test('invalid formats, extensions, settings, and input/output collisions cannot replace files', (t) => {
    const directory = temporary(t);
    const output = path.join(directory, 'keep.json');
    fs.writeFileSync(output, '{}');
    assert.throws(() => build({ format: 'unsupported', output, quiet: true }), /--format/);
    assert.throws(() => build({ format: 'spotifast', output: path.join(directory, 'wrong.css'), quiet: true }), /end in \.json/);
    assert.throws(() => build({ format: 'spotifast', configPath: output, output, quiet: true }), /separate from the configuration/);
    const alias = path.join(directory, 'alias.json');
    fs.symlinkSync(output, alias);
    assert.throws(() => build({ format: 'spotifast', configPath: output, output: alias, quiet: true }), /separate from the configuration/);
    assert.throws(() => build({ format: 'spotifast', custom: { colors: { accent: 'invalid' } }, output, quiet: true }), /six-digit/);
    assert.throws(() => build({ format: 'spotifast', output: path.join(root, 'src/do-not-write.json'), quiet: true }), /outside src/);
    for (const args of [['--format'], ['--format', 'unknown'], ['--format', 'css', '--format', 'spotifast']]) assert.throws(() => parseArgs(args));
    assert.equal(parseArgs(['--format', 'spotifast']).format, 'spotifast');
    assert.equal(fs.readFileSync(output, 'utf8'), '{}');
});

test('Spotifast watch mode follows config replacements and retains the last valid JSON', async (t) => {
    const directory = temporary(t);
    const configPath = path.join(directory, 'settings.json');
    const output = path.join(directory, 'watched.json');
    fs.writeFileSync(configPath, '{}');
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    const watcher = watch({ format: 'spotifast', configPath, output, quiet: true });
    t.after(() => { watcher.close(); console.error = originalError; });
    async function until(predicate) {
        const end = Date.now() + 3000;
        while (Date.now() < end) {
            if (predicate()) return;
            await delay(15);
        }
        assert.fail('Timed out waiting for Spotifast rebuild');
    }
    function replace(content) {
        const next = path.join(directory, 'next.json');
        fs.writeFileSync(next, content);
        fs.renameSync(next, configPath);
    }
    replace(JSON.stringify({ palette: 'amber' }));
    await until(() => JSON.parse(fs.readFileSync(output, 'utf8')).colors.window === '#342d23');
    const valid = fs.readFileSync(output, 'utf8');
    replace('{broken');
    await until(() => errors.some((message) => message.startsWith('Build failed:')));
    assert.equal(fs.readFileSync(output, 'utf8'), valid);
    replace(JSON.stringify({ palette: 'blue' }));
    await until(() => JSON.parse(fs.readFileSync(output, 'utf8')).colors.window === '#252e3e');
});
