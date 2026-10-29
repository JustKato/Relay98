// Build the installable theme with optional validated customization.
const fs = require('node:fs');
const path = require('node:path');
const customization = require('./customization');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const formats = {
    css: { suffix: '.theme.css' },
    palette: { suffix: '.palette.json', convert: customization.toPalette, label: 'colour palette' },
    spotifast: { suffix: '.spotifast.json', convert: customization.toSpotifast, label: 'Spotifast' },
};

function getFormat(name = 'css') {
    if (!Object.hasOwn(formats, name)) throw new Error('--format must be css, palette, or spotifast.');
    return formats[name];
}

const header = `/**
 * @name Relay98
 * @description A dark Discord theme with pixel fonts and retro window styling.
 * @author ${pkg.author}
 * @version ${pkg.version}
 * @source https://github.com/${pkg.author}/Relay98
 */

`;

// Read top-level imports without mistaking comments, quoted text, or URL
// semicolons for rules. This also handles multiline font imports.
function extractImports(css) {
    const imports = [];
    let body = '', last = 0, depth = 0, quote = '', comment = false;
    for (let i = 0; i < css.length; i++) {
        const char = css[i], next = css[i + 1];
        if (comment) {
            if (char === '*' && next === '/') { comment = false; i++; }
            continue;
        }
        if (quote) {
            if (char === '\\') i++;
            else if (char === quote) quote = '';
            continue;
        }
        if (char === '/' && next === '*') { comment = true; i++; continue; }
        if (char === '"' || char === "'") { quote = char; continue; }
        if (char === '{') depth++;
        if (char === '}') depth--;
        if (depth !== 0 || char !== '@' || !/^@import\b/i.test(css.slice(i))) continue;
        let end = i + 7, parentheses = 0, importQuote = '', importComment = false;
        for (; end < css.length; end++) {
            const token = css[end];
            if (importComment) {
                if (token === '*' && css[end + 1] === '/') { importComment = false; end++; }
            } else if (importQuote) {
                if (token === '\\') end++;
                else if (token === importQuote) importQuote = '';
            } else if (token === '/' && css[end + 1] === '*') { importComment = true; end++; }
            else if (token === '"' || token === "'") importQuote = token;
            else if (token === '(') parentheses++;
            else if (token === ')') parentheses--;
            else if (token === ';' && parentheses === 0) break;
        }
        if (end >= css.length) throw new Error('Unterminated CSS @import rule.');
        imports.push(css.slice(i, end + 1).trim());
        body += css.slice(last, i);
        last = end + 1;
        i = end;
    }
    return { imports, body: body + css.slice(last) };
}

// Resolve symlinked checkout paths even when the output directories do not exist.
function canonicalPath(file) {
    let current = path.resolve(file);
    const suffix = [];
    for (;;) {
        try { return path.join(fs.realpathSync(current), ...suffix); }
        catch (error) {
            if (error.code !== 'ENOENT' || current === path.dirname(current)) throw error;
            suffix.unshift(path.basename(current));
            current = path.dirname(current);
        }
    }
}

function outputPath(options = {}) {
    const custom = options.custom !== undefined || options.configPath !== undefined || options.variant !== undefined;
    const { suffix } = getFormat(options.format);
    const extension = path.extname(suffix);
    const stem = options.variant !== undefined
        ? customization.variants[options.variant].filename
        : `relay98${custom ? '-custom' : ''}`;
    const output = options.output
        ? path.resolve(options.output)
        : path.join(root, 'build', `${stem}${suffix}`);
    if (path.extname(output).toLowerCase() !== extension) throw new Error(`--output must end in ${extension}.`);
    // A build should never overwrite its source or configuration.
    const actualOutput = canonicalPath(output);
    const actualSource = canonicalPath(srcDir);
    if (actualOutput === actualSource || actualOutput.startsWith(`${actualSource}${path.sep}`)
        || (options.configPath !== undefined && actualOutput === canonicalPath(options.configPath))) {
        throw new Error('Choose an output outside src/ and separate from the configuration file.');
    }
    return output;
}

function build(options = {}) {
    if ([options.custom, options.configPath, options.variant].filter((value) => value !== undefined).length > 1) throw new Error('Use only one of --custom, --config, or --variant.');
    let config;
    if (options.configPath !== undefined) {
        try { config = customization.normalize(JSON.parse(fs.readFileSync(options.configPath, 'utf8'))); }
        catch (error) { throw new Error(`Could not load configuration ${options.configPath}: ${error.message}`); }
    } else if (options.custom !== undefined) config = customization.normalize(options.custom);
    else if (options.variant !== undefined) config = customization.normalize({ variant: options.variant });
    const output = outputPath(options);
    const format = getFormat(options.format);
    if (format.convert) {
        const theme = format.convert(config);
        const json = `${JSON.stringify(theme, null, 2)}\n`;
        const changed = writeOutput(output, json);
        if (!options.quiet) console.log(`${changed ? 'Built' : 'Unchanged'} ${path.relative(root, output)} (${format.label}).`);
        return { output, theme, json, changed };
    }
    const files = fs.readdirSync(srcDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
        .map((entry) => entry.name).sort();
    if (files.length === 0) throw new Error('No CSS source files found in src/.');
    const imports = new Set();
    const body = files.map((file) => {
        const result = extractImports(fs.readFileSync(path.join(srcDir, file), 'utf8'));
        for (const rule of result.imports) imports.add(rule);
        return `/* ---- src/${file} ---- */\n${result.body.trim()}\n`;
    }).join('\n');
    // The theme's only external imports are its Google font fallbacks.
    const importBlock = [...imports].filter((rule) => config?.googleFonts !== false || !/https?:\/\/fonts\.googleapis\.com\//i.test(rule)).join('\n');
    const overrides = config ? `\n/* Custom settings from customize.html or --config. */\n${customization.toCSS(config)}` : '';
    const name = config?.variant !== undefined && config.variant !== 'original' ? customization.variants[config.variant].label : 'Relay98 Custom';
    const metadata = config ? header.replace('@name Relay98', `@name ${name}`) : header;
    const css = metadata + (importBlock ? `${importBlock}\n\n` : '') + body + overrides;
    const changed = writeOutput(output, css);
    if (!options.quiet) console.log(`${changed ? 'Built' : 'Unchanged'} ${path.relative(root, output)} from ${files.length} source file(s).`);
    return { output, css, changed };
}

function writeOutput(output, content) {
    let previous;
    try { previous = fs.readFileSync(output, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const changed = previous !== content;
    if (changed) {
        fs.mkdirSync(path.dirname(output), { recursive: true });
        // Leave the last good export in place if writing fails.
        const temporary = `${output}.${process.pid}.tmp`;
        try {
            fs.writeFileSync(temporary, content);
            fs.renameSync(temporary, output);
        } finally {
            fs.rmSync(temporary, { force: true });
        }
    }
    return changed;
}

function parseArgs(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        if (flag === '--help' || flag === '-h') options.help = true;
        else if (flag === '--watch') options.watch = true;
        else if (['--custom', '--config', '--output', '--format', '--variant'].includes(flag)) {
            if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${flag} needs a value.`);
            const value = args[++i];
            const key = flag === '--config' ? 'configPath' : flag.slice(2);
            if (Object.hasOwn(options, key)) throw new Error(`${flag} may only be supplied once.`);
            options[key] = flag === '--custom' ? customization.decode(value) : flag === '--config' ? path.resolve(value) : value;
        } else throw new Error(`Unknown option: ${flag}. Run npm run build -- --help.`);
    }
    if ([options.custom, options.configPath, options.variant].filter((value) => value !== undefined).length > 1) throw new Error('Use only one of --custom, --config, or --variant.');
    getFormat(options.format);
    if (options.variant !== undefined) customization.normalize({ variant: options.variant });
    return options;
}

function watch(options = {}) {
    build(options);
    let timer;
    const rebuild = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            try { build(options); }
            catch (error) { console.error('Build failed:', error.message); }
        }, 80);
    };
    const watchers = [fs.watch(srcDir, (_event, filename) => {
        if (!filename || filename.endsWith('.css')) rebuild();
    })];
    if (options.configPath) {
        watchers.push(fs.watch(path.dirname(options.configPath), (_event, filename) => {
            if (!filename || filename === path.basename(options.configPath)) rebuild();
        }));
    }
    for (const watcher of watchers) watcher.on('error', (error) => { console.error('Watch failed:', error.message); });
    console.log('Watching src/' + (options.configPath ? ' and configuration' : '') + ' for changes...');
    return { close() { clearTimeout(timer); for (const watcher of watchers) watcher.close(); } };
}

function main(args = process.argv.slice(2)) {
    const options = parseArgs(args);
    if (options.help) {
        console.log(`Usage: npm run build -- [options]
  --custom TOKEN    Settings copied from customize.html (URL-safe base64 JSON)
  --config FILE     Read settings from a JSON file
  --variant NAME    Build original or discord with its preset colours and avatars
  --format FORMAT   Export css (default), palette, or spotifast
  --output FILE     Write the exported .css or .json file at this path
  --watch           Rebuild when source or configuration changes
  --help            Show this help

Default output: build/relay98.theme.css
Customized output: build/relay98-custom.theme.css
Spotifast output: build/relay98.spotifast.json
Customized Spotifast output: build/relay98-custom.spotifast.json
Palette output: build/relay98.palette.json
Customized palette output: build/relay98-custom.palette.json`);
    } else if (options.watch) watch(options);
    else build(options);
}

if (require.main === module) {
    try { main(); }
    catch (error) { console.error('Build failed:', error.message); process.exitCode = 1; }
}

module.exports = { build, extractImports, parseArgs, watch };
