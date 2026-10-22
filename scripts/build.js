// Build the installable theme with optional validated customization.
const fs = require('node:fs');
const path = require('node:path');
const customization = require('./customization');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

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
    const custom = options.custom !== undefined || options.configPath !== undefined;
    const output = options.output
        ? path.resolve(options.output)
        : path.join(root, 'build', custom ? 'relay98-custom.theme.css' : 'relay98.theme.css');
    if (path.extname(output).toLowerCase() !== '.css') throw new Error('--output must end in .css.');
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
    if (options.custom !== undefined && options.configPath !== undefined) throw new Error('Use either --custom or --config, not both.');
    let config;
    if (options.configPath !== undefined) {
        try { config = customization.normalize(JSON.parse(fs.readFileSync(options.configPath, 'utf8'))); }
        catch (error) { throw new Error(`Could not load configuration ${options.configPath}: ${error.message}`); }
    } else if (options.custom !== undefined) config = customization.normalize(options.custom);
    const output = outputPath(options);
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
    const metadata = config ? header.replace('@name Relay98', '@name Relay98 Custom') : header;
    const css = metadata + (importBlock ? `${importBlock}\n\n` : '') + body + overrides;
    let previous;
    try { previous = fs.readFileSync(output, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const changed = previous !== css;
    if (changed) {
        fs.mkdirSync(path.dirname(output), { recursive: true });
        // Keep a failed write from leaving a partially written installable theme.
        const temporary = `${output}.${process.pid}.tmp`;
        try {
            fs.writeFileSync(temporary, css);
            fs.renameSync(temporary, output);
        } finally {
            fs.rmSync(temporary, { force: true });
        }
    }
    if (!options.quiet) console.log(`${changed ? 'Built' : 'Unchanged'} ${path.relative(root, output)} from ${files.length} source file(s).`);
    return { output, css, changed };
}

function parseArgs(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        if (flag === '--help' || flag === '-h') options.help = true;
        else if (flag === '--watch') options.watch = true;
        else if (['--custom', '--config', '--output'].includes(flag)) {
            if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${flag} needs a value.`);
            const value = args[++i];
            const key = flag === '--config' ? 'configPath' : flag.slice(2);
            if (Object.hasOwn(options, key)) throw new Error(`${flag} may only be supplied once.`);
            options[key] = flag === '--custom' ? customization.decode(value) : flag === '--config' ? path.resolve(value) : value;
        } else throw new Error(`Unknown option: ${flag}. Run npm run build -- --help.`);
    }
    if (options.custom !== undefined && options.configPath !== undefined) throw new Error('Use either --custom or --config, not both.');
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
  --output FILE     Write a .css file at this path
  --watch           Rebuild when source or configuration changes
  --help            Show this help

Default output: build/relay98.theme.css
Customized output: build/relay98-custom.theme.css`);
    } else if (options.watch) watch(options);
    else build(options);
}

if (require.main === module) {
    try { main(); }
    catch (error) { console.error('Build failed:', error.message); process.exitCode = 1; }
}

module.exports = { build, extractImports, parseArgs, watch };
