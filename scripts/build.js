// Relay98 build script.
// Concatenates every file in /src (in filename order) into one self-contained
// BetterDiscord/Vesktop theme file at build/relay98.theme.css, with the
// metadata header BD/Vesktop need to recognize it as a theme.
//
// No dependencies required: `node scripts/build.js`

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const buildDir = path.join(root, 'build');
const buildFile = path.join(buildDir, 'relay98.theme.css');

const pkg = require(path.join(root, 'package.json'));

const header = `/**
 * @name Relay98
 * @description A dark Windows 98 / neocities inspired theme for Discord.
 * @author ${pkg.author}
 * @version ${pkg.version}
 * @source https://github.com/${pkg.author}/Relay98
 */

`;

function build() {
    const files = fs
        .readdirSync(srcDir)
        .filter((file) => file.endsWith('.css'))
        .sort((a, b) => a.localeCompare(b));

    // @import is only valid at the very top of a stylesheet, so pull every
    // @import out of the source files and hoist them above everything else.
    const imports = [];
    // line-based on purpose: google fonts urls contain ';' (wght@400;700)
    const importRe = /^[ \t]*@import\b.*;[ \t]*$/gm;

    const body = files
        .map((file) => {
            const css = fs.readFileSync(path.join(srcDir, file), 'utf8').replace(importRe, (match) => {
                imports.push(match.trim());
                return '';
            });
            return `/* ---- src/${file} ---- */\n${css.trim()}\n`;
        })
        .join('\n');

    const importBlock = imports.length ? `${[...new Set(imports)].join('\n')}\n\n` : '';

    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(buildFile, header + importBlock + body);

    console.log(`Built build/relay98.theme.css from ${files.length} source file(s).`);
}

function watch() {
    build();
    console.log('Watching src/ for changes...');
    fs.watch(srcDir, { persistent: true }, (_event, filename) => {
        if (filename && filename.endsWith('.css')) {
            try {
                build();
            } catch (err) {
                console.error('Build failed:', err.message);
            }
        }
    });
}

if (require.main === module) {
    if (process.argv.includes('--watch')) {
        watch();
    } else {
        build();
    }
}

module.exports = { build };
