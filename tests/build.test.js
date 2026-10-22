const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const test = require('node:test');
const { build, extractImports, parseArgs, watch } = require('../scripts/build');
const customization = require('../scripts/customization');

const root = path.join(__dirname, '..');
const script = path.join(root, 'scripts/build.js');

function temporary(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'relay98-build-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}

function fixture(t) {
    const directory = temporary(t);
    fs.mkdirSync(path.join(directory, 'scripts'));
    fs.mkdirSync(path.join(directory, 'src'));
    for (const name of ['build.js', 'customization.js']) {
        fs.copyFileSync(path.join(root, 'scripts', name), path.join(directory, 'scripts', name));
    }
    fs.copyFileSync(path.join(root, 'package.json'), path.join(directory, 'package.json'));
    return { directory, build: require(path.join(directory, 'scripts', 'build.js')).build };
}

test('import extraction preserves URL semicolons, multiline rules, comments, and literal text', () => {
    const first = '@import url("https://fonts.googleapis.com/css2?family=Test:wght@400;700&display=swap");';
    const second = '@IMPORT\n/* import detail ; */ url(other.css)\nlayer(fonts) supports(font-format(woff2)) screen;';
    const untouched = String.raw`/* @import "comment.css"; */
.sample::before { content: "@import 'string.css';"; }
.escaped::after { content: "quote: \" @import 'also-string.css';"; }
@media screen { @import "nested.css"; }
.icon { background: url(data:image/svg+xml;base64,PHN2Zz4=); }`;
    const result = extractImports(`${first}\n${untouched}\n${second}\n.end { color: green; }`);
    assert.deepEqual(result.imports, [first, second]);
    assert.ok(result.body.includes(untouched));
    assert.ok(result.body.includes('.end { color: green; }'));
    assert.equal(result.body.includes(first), false);
    assert.equal(result.body.includes(second), false);
    assert.throws(() => extractImports('@import url("unfinished.css")'), /Unterminated/);
    assert.throws(() => extractImports('@import "unfinished' + '\\'), /Unterminated/, 'a final escape must not skip the EOF check');
});

test('ordinary builds are deterministic and do not rewrite unchanged output', (t) => {
    const directory = temporary(t);
    const output = path.join(directory, 'default.theme.css');
    const first = build({ output, quiet: true });
    assert.equal(first.changed, true);
    assert.match(first.css, /\* @name Relay98\n/);
    assert.doesNotMatch(first.css, /Custom settings from/);
    const sourceNames = fs.readdirSync(path.join(root, 'src')).filter(name => name.endsWith('.css')).sort();
    const bundledNames = [...first.css.matchAll(/\/\* ---- src\/(.+?) ---- \*\//g)].map(match => match[1]);
    assert.deepEqual(bundledNames, sourceNames);
    const imported = extractImports(first.css);
    assert.equal(new Set(imported.imports).size, imported.imports.length);
    assert.ok(first.css.indexOf('@import') < first.css.indexOf('/* ---- src/'));

    // A fixed old timestamp makes redundant writes detectable without sleeps.
    fs.utimesSync(output, 1, 1);
    const before = fs.statSync(output, { bigint: true });
    const second = build({ output, quiet: true });
    const after = fs.statSync(output, { bigint: true });
    assert.equal(second.changed, false);
    assert.equal(second.css, first.css);
    assert.equal(after.mtimeNs, before.mtimeNs);
    assert.equal(after.ino, before.ino);
    assert.deepEqual(fs.readdirSync(directory), ['default.theme.css']);
});

test('default and custom output paths stay separate and disabling Google Fonts preserves other imports', (t) => {
    const isolated = fixture(t);
    const google = '@import url("https://fonts.googleapis.com/css2?family=Example:wght@400;700");';
    const local = '@import\nurl("local-fonts.css") screen;';
    fs.writeFileSync(path.join(isolated.directory, 'src', 'a.css'), `${google}\n${local}\n:root { --fixture: 1; }`);
    fs.writeFileSync(path.join(isolated.directory, 'src', 'b.css'), `${google}\n.sample { color: green; }`);
    const standard = isolated.build();
    assert.equal(standard.output, path.join(isolated.directory, 'build', 'relay98.theme.css'));
    assert.deepEqual(extractImports(standard.css).imports, [google, local]);
    const custom = isolated.build({ custom: { googleFonts: false }, quiet: true });
    assert.equal(custom.output, path.join(isolated.directory, 'build', 'relay98-custom.theme.css'));
    assert.deepEqual(extractImports(custom.css).imports, [local]);
    assert.equal(fs.readFileSync(standard.output, 'utf8'), standard.css);
});

test('custom config and encoded CLI builds produce the same separate theme', (t) => {
    const directory = temporary(t);
    const output = path.join(directory, 'config.theme.css');
    const cliOutput = path.join(directory, 'token.theme.css');
    const configPath = path.join(directory, 'settings.json');
    const config = { palette: 'amber', sizes: { fontSize: 20, memberWidth: 300 }, fonts: { ui: 'system-ui, sans-serif' }, effects: { textures: false }, googleFonts: false };
    fs.writeFileSync(configPath, JSON.stringify(config));
    const configured = build({ output, configPath, quiet: true });
    assert.match(configured.css, /@name Relay98 Custom/);
    assert.match(configured.css, /--r98-font-size: 20px;/);
    assert.match(configured.css, /--r98-pat-scan: none;/);
    assert.equal(extractImports(configured.css).imports.length, 0);
    const result = spawnSync(process.execPath, [script, '--custom', customization.encode(config), '--output', cliOutput], { encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(cliOutput, 'utf8'), configured.css);
});

test('invalid settings and CLI arguments leave existing output untouched', (t) => {
    const directory = temporary(t);
    const output = path.join(directory, 'keep.theme.css');
    fs.writeFileSync(output, 'existing theme');
    for (const custom of [{ colors: { accent: '#fff' } }, { sizes: { fontSize: 999 } }, { fonts: { ui: 'Arial; color:red' } }]) {
        assert.throws(() => build({ custom, output, quiet: true }));
        assert.equal(fs.readFileSync(output, 'utf8'), 'existing theme');
    }
    const configPath = path.join(directory, 'broken.json');
    fs.writeFileSync(configPath, '{invalid');
    assert.throws(() => build({ configPath, output, quiet: true }), /Could not load configuration/);
    assert.throws(() => build({ output: path.join(root, 'src', 'do-not-write.css'), quiet: true }), /outside src/);
    assert.equal(fs.existsSync(path.join(root, 'src', 'do-not-write.css')), false);
    assert.throws(() => build({ output: path.join(directory, 'not-css.txt'), quiet: true }), /end in \.css/);
    for (const args of [['--unknown'], ['--output'], ['--config', '--watch'], ['--output', output, '--output', output], ['--custom', customization.encode({}), '--config', configPath]]) {
        assert.throws(() => parseArgs(args));
    }
    const failed = spawnSync(process.execPath, [script, '--unknown', '--output', output], { encoding: 'utf8' });
    assert.ifError(failed.error);
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /Unknown option: --unknown/);
    assert.equal(fs.readFileSync(output, 'utf8'), 'existing theme');
    assert.deepEqual(fs.readdirSync(directory).sort(), ['broken.json', 'keep.theme.css']);
});

test('output protection resolves source symlinks and relative configuration paths', (t) => {
    const isolated = fixture(t);
    const source = path.join(isolated.directory, 'src', 'theme.css');
    fs.writeFileSync(source, ':root { --fixture: original; }');
    const alias = path.join(isolated.directory, 'source-alias');
    fs.symlinkSync(path.join(isolated.directory, 'src'), alias, 'dir');
    for (const output of [path.join(alias, 'theme.css'), path.join(alias, 'new-directory', 'custom.css')]) {
        assert.throws(() => isolated.build({ output, quiet: true }), /outside src/);
    }
    assert.equal(fs.readFileSync(source, 'utf8'), ':root { --fixture: original; }');
    assert.equal(fs.existsSync(path.join(alias, 'new-directory')), false);

    // Config files are parsed as JSON regardless of extension; keep them intact.
    const configPath = path.join(isolated.directory, 'settings.css');
    fs.writeFileSync(configPath, '{}');
    const relativeConfig = path.relative(process.cwd(), configPath);
    assert.throws(() => isolated.build({ configPath: relativeConfig, output: configPath, quiet: true }), /separate from the configuration/);
    const configAlias = path.join(isolated.directory, 'config-alias.css');
    fs.symlinkSync(configPath, configAlias);
    assert.throws(() => isolated.build({ configPath: relativeConfig, output: configAlias, quiet: true }), /separate from the configuration/);
    assert.equal(fs.readFileSync(configPath, 'utf8'), '{}');
});

async function until(predicate) {
    const end = Date.now() + 3000;
    while (Date.now() < end) {
        if (predicate()) return;
        await delay(15);
    }
    assert.fail('Timed out waiting for a configuration rebuild');
}

test('watch mode follows atomic configuration replacements and recovers after an invalid edit', async (t) => {
    const directory = temporary(t);
    const output = path.join(directory, 'watched.theme.css');
    const configPath = path.join(directory, 'settings.json');
    fs.writeFileSync(configPath, '{}');
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    const watcher = watch({ configPath, output, quiet: true });
    t.after(() => { watcher.close(); console.error = originalError; });
    const replace = (text) => {
        const next = path.join(directory, 'next.json');
        fs.writeFileSync(next, text);
        fs.renameSync(next, configPath);
    };
    replace(JSON.stringify({ palette: 'blue' }));
    await until(() => fs.readFileSync(output, 'utf8').includes('--r98-bg-0: #171c25;'));
    const valid = fs.readFileSync(output, 'utf8');
    replace('{invalid');
    await until(() => errors.some(message => message.startsWith('Build failed:')));
    assert.equal(fs.readFileSync(output, 'utf8'), valid);
    replace(JSON.stringify({ palette: 'plum', sizes: { fontSize: 21 } }));
    await until(() => fs.readFileSync(output, 'utf8').includes('--r98-font-size: 21px;'));
    assert.ok(fs.readFileSync(output, 'utf8').includes('--r98-bg-0: #211923;'));
});
