const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { serveDemos } = require('../scripts/screenshot');

function request(server, pathname) {
    return new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port: server.address().port, path: pathname }, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
            response.on('error', reject);
        });
        req.on('error', reject);
    });
}

test('demo server serves local assets and handles invalid paths without exposing the project', async (t) => {
    const server = await serveDemos();
    t.after(() => new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
    }));

    const page = await request(server, '/demos/chat.html?theme=/theme.css');
    assert.equal(page.status, 200);
    assert.equal(page.headers['content-type'], 'text/html');
    assert.match(page.body.toString(), /demo\.js/);

    const font = await request(server, '/demos/fonts/VT323-Regular.ttf');
    assert.equal(font.status, 200);
    assert.equal(font.headers['content-type'], 'font/ttf');
    assert.ok(font.body.length > 0);

    for (const pathname of ['/package.json', '/demos/../package.json', '/demos/%2e%2e%2fpackage.json', '/demos', '/demos/', '/demos/missing.css', '/demos/demo.js/child']) {
        assert.equal((await request(server, pathname)).status, 404, pathname);
    }
    for (const pathname of ['/demos/%', '/demos/%ZZ', '/demos/%00']) {
        assert.equal((await request(server, pathname)).status, 400, pathname);
    }
    assert.equal((await request(server, '/demos/demo.js')).status, 200, 'server remains usable after bad requests');
});

const demoSource = fs.readFileSync(path.join(__dirname, '../demos/demo.js'), 'utf8');

function loadDemo({ setupError, themeError } = {}) {
    const dataset = {};
    const notices = [];
    const listeners = new Map();
    const link = { addEventListener: (event, listener) => listeners.set(event, listener) };
    const document = {
        documentElement: { dataset },
        readyState: 'complete',
        images: [],
        fonts: { ready: Promise.resolve() },
        querySelectorAll: () => [],
        createElementNS: () => ({ setAttribute() {} }),
        createElement: (name) => name === 'link' ? link : { setAttribute() {} },
        head: { append: () => listeners.get(themeError ? 'error' : 'load')() },
        body: {
            prepend: () => { if (setupError) throw new Error(setupError); },
            append: (notice) => notices.push(notice),
        },
    };
    const window = { location: { search: '?theme=/theme.css', protocol: 'http:' } };
    vm.runInNewContext(demoSource, {
        document, window, URL, URLSearchParams,
        requestAnimationFrame: (callback) => queueMicrotask(callback),
        console: { error() {} },
    });
    return { window, dataset, notices, link };
}

test('demo readiness waits for initialization and retains the requested theme', async () => {
    const { window, dataset, link } = loadDemo();
    assert.equal(dataset.demoStatus, 'loading');
    await window.demoReady;
    assert.equal(dataset.demoStatus, 'ready');
    assert.equal(dataset.demoReady, 'true');
    assert.equal(link.href, '/theme.css');
});

test('demo initialization failures reject readiness and display the error', async () => {
    const { window, dataset, notices } = loadDemo({ setupError: 'Icon setup failed' });
    await assert.rejects(window.demoReady, /Icon setup failed/);
    assert.equal(dataset.demoStatus, 'error');
    assert.equal(dataset.demoError, 'Icon setup failed');
    assert.equal(dataset.demoReady, undefined);
    assert.match(notices[0].textContent, /Icon setup failed/);
});

test('missing themes reject readiness and display the failing URL', async () => {
    const { window, dataset, notices } = loadDemo({ themeError: true });
    await assert.rejects(window.demoReady, /Could not load theme: \/theme\.css/);
    assert.equal(dataset.demoStatus, 'error');
    assert.match(notices[0].textContent, /Could not load theme: \/theme\.css/);
});
