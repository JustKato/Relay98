// Capture the README images separately from the CSS build and release workflow.
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { build } = require('./build');

const root = path.resolve(__dirname, '..');
const demosRoot = path.join(root, 'demos');
const width = 1920;
const height = 1080;
const scenes = ['chat', 'friends', 'settings'];

function run(executable, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(executable, args, { cwd: root, stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code, signal) => {
            if (code === 0) resolve();
            else reject(new Error(`Screenshot setup failed (${signal || `exit ${code}`}).`));
        });
    });
}

async function prepareBrowser() {
    if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Screenshots require Node.js 20 or newer.');
    // Install Playwright and Chromium here so normal builds don't need them.
    const packageRoot = path.join(demosRoot, 'node_modules', 'playwright');
    const expected = require('../demos/package.json').devDependencies.playwright;
    let installed;
    try { installed = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8')).version; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (installed !== expected) {
        if (!process.env.npm_execpath) throw new Error('Run npm run screenshot to install its local dependencies.');
        console.log('Installing screenshot dependencies in demos/node_modules...');
        await run(process.execPath, [process.env.npm_execpath, 'ci', '--prefix', demosRoot, '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund']);
    }

    process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.tools', 'chromium');
    const { chromium } = require(packageRoot);
    if (!process.env.CHROMIUM_BIN && !existsSync(chromium.executablePath())) {
        console.log('Downloading Chromium for screenshots into .tools/chromium...');
        await run(process.execPath, [path.join(packageRoot, 'cli.js'), 'install', 'chromium', '--no-shell']);
    }
    return chromium;
}

async function serveDemos() {
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf' };
    const server = http.createServer(async (request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            if (pathname.includes('\0')) throw new URIError('Invalid path');
            const file = pathname === '/theme.css'
                ? path.join(root, 'build', 'relay98.theme.css')
                : path.resolve(root, `.${pathname}`);
            if (pathname !== '/theme.css' && !file.startsWith(`${demosRoot}${path.sep}`)) {
                response.writeHead(404).end();
                return;
            }
            const body = await fs.readFile(file);
            response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            response.end(body);
        } catch (error) {
            const status = error instanceof URIError || error.code === 'ERR_INVALID_URL'
                ? 400
                : ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 500;
            response.writeHead(status).end();
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    return server;
}

async function main() {
    const chromium = await prepareBrowser();
    build();
    let browser, server;
    try {
        server = await serveDemos();
        const origin = `http://127.0.0.1:${server.address().port}`;
        browser = await chromium.launch({
            headless: true,
            ...(process.env.CHROMIUM_BIN ? { executablePath: process.env.CHROMIUM_BIN } : { channel: 'chromium' }),
        });
        const context = await browser.newContext({
            viewport: { width, height }, deviceScaleFactor: 1,
            colorScheme: 'dark', reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC',
        });
        // Load photos and fonts from the repo; block external requests.
        await context.route('**/*', (route) => {
            const url = new URL(route.request().url());
            if (url.origin === origin) return route.continue();
            // discord.css loads the bundled TTFs, so this import can be empty.
            if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
            return route.abort();
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const captures = [];
        for (const scene of scenes) {
            errors.length = 0;
            await page.goto(`${origin}/demos/${scene}.html?theme=/theme.css`, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => ['ready', 'error'].includes(document.documentElement.dataset.demoStatus), null, { timeout: 30_000 });
            await page.evaluate(() => window.demoReady);
            if (errors.length) throw new Error(`${scene}: ${errors.join('; ')}`);
            const png = await page.screenshot({ type: 'png', fullPage: false, animations: 'disabled', caret: 'hide' });
            if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) {
                throw new Error(`${scene}: Chromium did not return a ${width}×${height} PNG`);
            }
            captures.push({ scene, png });
        }

        // Replace the README images only after every capture succeeds.
        await fs.mkdir(path.join(root, 'assets'), { recursive: true });
        for (const { scene, png } of captures) {
            await fs.writeFile(path.join(root, 'assets', `${scene}.png`), png);
            console.log(`Saved assets/${scene}.png (${width}×${height}, Chromium)`);
        }
    } finally {
        try { await browser?.close(); }
        finally {
            if (server) {
                server.closeAllConnections();
                await new Promise((resolve) => server.close(resolve));
            }
        }
    }
}

if (require.main === module) {
    main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { prepareBrowser, serveDemos, main };
