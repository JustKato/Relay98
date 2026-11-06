// End-to-end checks using the same optional browser setup as screenshots.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { prepareBrowser } = require('./screenshot');
const { build } = require('./build');
const customization = require('./customization');

const root = path.resolve(__dirname, '..');
const fileURL = (file) => pathToFileURL(path.join(root, file)).href;

async function main() {
    const chromium = await prepareBrowser();
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'relay98-browser-'));
    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            ...(process.env.CHROMIUM_BIN ? { executablePath: process.env.CHROMIUM_BIN } : { channel: 'chromium' }),
        });
        const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
        const externalRequests = [];
        await context.route(/^https?:/, (route) => {
            externalRequests.push(route.request().url());
            return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
        });
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
                writeText: async (text) => { window.testCopied = text; },
            } });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const command = () => page.locator('#build-command').inputValue();
        const readConfig = async () => customization.decode((await command()).split(' ').at(-1));
        const showSetting = async (selector) => {
            const panel = await page.locator(selector).evaluate((node) => node.closest('.settings-page')?.id);
            if (panel) await page.locator(`.settings-tabs [aria-controls="${panel}"]`).click();
        };
        const choose = async (selector, value) => {
            await showSetting(selector);
            const label = await page.locator(selector).evaluate((node, selected) => [...node.options].find((option) => option.value === selected).textContent, value);
            await page.locator(`${selector}-trigger`).click();
            await page.getByRole('option', { name: label, exact: true }).click();
        };
        const change = async (selector, value) => {
            await showSetting(selector);
            await page.locator(selector).fill(String(value));
            await page.locator(selector).blur();
        };
        const downloadJSON = async (selector) => {
            const event = page.waitForEvent('download');
            await page.locator(selector).click();
            const download = await event;
            const filename = download.suggestedFilename();
            const file = path.join(temporary, filename);
            await download.saveAs(file);
            return { filename, file, value: JSON.parse(await fs.readFile(file, 'utf8')) };
        };
        const checkLayout = async (width, height) => {
            await page.setViewportSize({ width, height });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Page overflow at ${width}px`);
        };
        const image = async (name) => {
            if (!process.env.RELAY98_TEST_SCREENSHOTS) return;
            await fs.mkdir(process.env.RELAY98_TEST_SCREENSHOTS, { recursive: true });
            await page.screenshot({ path: path.join(process.env.RELAY98_TEST_SCREENSHOTS, name), fullPage: true });
        };

        await page.goto(fileURL('customize.html'));
        await page.waitForFunction(() => document.documentElement.dataset.customizerStatus === 'ready');
        await page.evaluate(() => document.fonts.ready);
        assert.deepEqual(await readConfig(), customization.defaults);
        assert.match(await page.locator('.preview-title').evaluate((node) => getComputedStyle(node).backgroundImage), /linear-gradient/);

        // Exercise the visible controls, including keyboard-only editing.
        await page.locator('#settings-tab-colours').press('End');
        assert.equal(await page.locator('#settings-effects').isVisible(), true);
        await page.locator('#settings-tab-effects').press('Home');
        assert.equal(await page.locator('#settings-colours').isVisible(), true);
        await page.locator('#theme-version-trigger').press('End');
        await page.locator('#theme-version-trigger').press('Enter');
        assert.equal((await readConfig()).variant, 'discord');
        await page.locator('#theme-version-trigger').press('Home');
        await page.locator('#theme-version-trigger').press('Escape');
        assert.equal((await readConfig()).variant, 'discord', 'Escape cancels a pending dropdown selection');
        await page.locator('#reset-settings').click();
        assert.equal(await page.locator('#theme-version-trigger').textContent(), 'Original');
        await showSetting('#font-ui');
        await page.locator('#font-ui-trigger').press('End');
        await page.locator('#font-ui-trigger').press('Tab');
        assert.equal(await page.locator('#font-custom-ui').evaluate((node) => node === document.activeElement), true, 'Custom keeps focus in the new font field');
        await page.locator('#reset-settings').click();
        await showSetting('#hex-accent');

        await page.locator('#color-accent-trigger').click();
        await page.locator('#picker-hex').fill('#123456');
        await page.locator('#picker-hex').press('Enter');
        assert.equal((await readConfig()).colors.accent, '#123456');
        await change('#picker-h', 210);
        await change('#picker-s', 50);
        await change('#picker-v', 80);
        assert.equal((await readConfig()).colors.accent, '#6699cc');
        const lastValidColour = (await readConfig()).colors.accent;
        await change('#picker-hex', 'oops');
        assert.equal(await page.locator('#picker-hex').getAttribute('aria-invalid'), 'true');
        assert.equal((await readConfig()).colors.accent, lastValidColour);
        await change('#picker-hex', '#000000');
        await change('#picker-h', 210);
        await change('#picker-s', 100);
        await change('#picker-v', 50);
        assert.equal((await readConfig()).colors.accent, '#004080', 'the hue survives editing a black colour');
        await page.locator('#picker-hue').focus();
        await page.locator('#picker-hue').press('Home');
        assert.equal((await readConfig()).colors.accent, '#800000', 'the hue slider works from the keyboard');
        const plane = await page.locator('.colour-plane').boundingBox();
        await page.mouse.move(plane.x + plane.width * .25, plane.y + plane.height * .25);
        await page.mouse.down();
        await page.mouse.move(plane.x + plane.width * .7, plane.y + plane.height * .3);
        await page.mouse.up();
        assert.ok(Math.abs(Number(await page.locator('#picker-s').inputValue()) - 70) <= 1);
        assert.ok(Math.abs(Number(await page.locator('#picker-v').inputValue()) - 70) <= 1);
        await page.locator('#picker-hex').fill('#246abc');
        await page.locator('h1').click();
        assert.equal((await readConfig()).colors.accent, '#246abc', 'clicking outside commits a typed colour');
        assert.equal(await page.locator('#editor-colour-picker').isHidden(), true);
        await page.locator('#color-accent-trigger').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#color-accent-trigger').evaluate((node) => node === document.activeElement), true);
        await page.locator('#reset-settings').click();
        assert.deepEqual(await readConfig(), customization.defaults);
        assert.equal(await page.locator('#color-accent-trigger').evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(74, 122, 84)');
        await image('customize-desktop.png');
        assert.equal(await page.locator('[data-palette]').count(), 2);
        await choose('#theme-version', 'discord');
        assert.equal((await readConfig()).palette, 'discord');
        assert.equal((await readConfig()).avatarShape, 'round');
        assert.equal(await page.locator('.avatar').first().evaluate((node) => getComputedStyle(node).borderRadius), '50%');
        await choose('#avatar-shape', 'square');
        assert.equal(await page.locator('.avatar').first().evaluate((node) => getComputedStyle(node).borderRadius), '0px');
        await choose('#avatar-shape', 'round');
        await change('#hex-bg-2', '#18293a');
        await change('#size-fontSize', 20);
        await change('#size-codeSize', 18);
        await change('#size-sidebarWidth', 288);
        await change('#size-memberWidth', 264);
        await change('#size-messageSpacing', 12);
        await change('#size-radius', 6);
        await change('#size-scrollbarWidth', 18);
        await choose('#font-ui', 'system');
        await choose('#font-code', 'custom');
        await change('#font-custom-code', '"Courier New", monospace');
        const backgroundImage = (selector) => page.locator(selector).first().evaluate((node) => getComputedStyle(node).backgroundImage);
        await showSetting('#effect-dots');
        await page.locator('#effect-dots').uncheck();
        assert.equal(await backgroundImage('.preview-sidebar'), 'none');
        assert.match(await backgroundImage('.preview-chat'), /gradient/, 'other patterns stay on');
        assert.equal(await page.locator('#patterns-all').evaluate((node) => node.indeterminate), true);
        assert.match(await page.locator('#pattern-summary').textContent(), /4 of 5 on/);
        await page.locator('#patterns-all').uncheck();
        for (const toggle of ['effect-bevels', 'effect-shadows', 'google-fonts']) {
            await showSetting(`#${toggle}`);
            await page.locator(`#${toggle}`).uncheck();
        }
        const config = await readConfig();
        assert.equal(config.colors['bg-2'], '#18293a');
        assert.equal(config.sizes.fontSize, 20);
        assert.equal(config.googleFonts, false);
        for (const { key } of customization.patterns) assert.equal(config.effects[key], false, key);
        for (const selector of ['.preview-chat', '.preview-rail', '.fake-scrollbar']) assert.equal(await backgroundImage(selector), 'none', selector);
        assert.equal(await page.locator('.preview-button').first().evaluate((node) => getComputedStyle(node).boxShadow), 'none');
        await showSetting('#effect-scanlines');
        await page.locator('#effect-scanlines').check();
        assert.match(await backgroundImage('.preview-chat'), /gradient/);
        await page.locator('#effect-scanlines').uncheck();

        // Preview tabs switch apps and pages, and Spotifast follows the export colours.
        await page.locator('#tab-spotifast').click();
        assert.equal(await page.locator('#theme-preview').isHidden(), true);
        assert.equal(await page.locator('#spotifast-preview').isVisible(), true);
        assert.equal(await page.locator('.sf-player').evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(' + customization.toSpotifast(config).colors.panel.slice(1).match(/../g).map((hex) => parseInt(hex, 16)).join(', ') + ')');
        await page.locator('#page-tabs [data-page="liked"]').click();
        assert.equal(await page.locator('.sf-page[data-page="liked"]').isVisible(), true);
        assert.match(await page.locator('.sf-tracks').textContent(), /Fingernails[\s\S]*Glimpse of Us[\s\S]*Jocelyn Flores/);
        await page.locator('#page-tabs [aria-selected="true"]').press('ArrowLeft');
        assert.equal(await page.locator('.sf-page[data-page="home"]').isVisible(), true);
        await page.locator('#tab-spotifast').press('ArrowLeft');
        await page.locator('#page-tabs [data-page="friends"]').click();
        assert.equal(await page.locator('.preview-body[data-page="friends"]').isVisible(), true);
        assert.equal(await page.locator('#discord-title').textContent(), 'Friends');
        await page.locator('#page-tabs [data-page="chat"]').click();
        const generated = await command();
        assert.match(generated, /^npm run build -- --custom [A-Za-z0-9_-]+$/);
        await page.locator('#copy-command').click();
        assert.equal(await page.evaluate(() => window.testCopied), generated);
        await page.evaluate(() => {
            navigator.clipboard.writeText = async () => { throw new Error('Permission denied'); };
            document.execCommand = () => false;
        });
        await page.locator('#copy-command').click();
        assert.match(await page.locator('#feedback').textContent(), /Command selected/);
        assert.equal(await page.locator('#build-command').evaluate((node) => node.selectionEnd - node.selectionStart), generated.length);

        // Invalid edits must never replace the last buildable configuration.
        await change('#hex-bg-2', 'oops');
        assert.equal(await page.locator('#hex-bg-2').getAttribute('aria-invalid'), 'true');
        assert.equal(await command(), generated);
        await change('#hex-bg-2', '#18293a');
        await change('#size-fontSize', 999);
        assert.equal(await command(), generated);
        await change('#size-fontSize', 20);
        await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"sizes":{"fontSize":999}}') });
        await page.waitForFunction(() => document.getElementById('feedback').textContent.includes('Could not load settings'));
        assert.equal(await command(), generated);
        const settings = await downloadJSON('#export-settings');
        assert.equal(settings.filename, 'relay98-settings.json');
        assert.deepEqual(customization.normalize(settings.value), config);
        const spotifast = await downloadJSON('#export-spotifast');
        assert.equal(spotifast.filename, 'relay98-custom.spotifast.json');
        assert.deepEqual(spotifast.value, customization.toSpotifast(config));
        assert.equal(spotifast.value.colors.window, '#18293a');
        const palette = await downloadJSON('#export-palette');
        assert.equal(palette.filename, 'relay98-custom.palette.json');
        assert.deepEqual(palette.value, customization.toPalette(config));
        for (const file of [spotifast.file, palette.file]) {
            await page.locator('#import-file').setInputFiles(file);
            await page.waitForFunction(() => document.getElementById('feedback').textContent.includes('Load relay98-settings.json'));
            assert.equal(await command(), generated, 'importing a palette keeps the workshop settings');
        }
        await page.reload();
        await page.waitForFunction(() => document.documentElement.dataset.customizerStatus === 'ready');
        assert.equal(await command(), generated, 'saved settings survive a reload');
        assert.equal(await page.locator('#page-tabs [aria-selected="true"]').textContent(), 'Chat');
        await page.locator('#reset-settings').click();
        assert.deepEqual(await readConfig(), customization.defaults);
        await page.locator('#import-file').setInputFiles(settings.file);
        await page.waitForFunction(() => document.getElementById('feedback').textContent.startsWith('Loaded '));
        assert.equal(await command(), generated);
        for (const width of [1440, 1024, 768, 390, 320]) await checkLayout(width, 950);
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            await showSetting('#hex-bg-2');
            await page.locator('#color-bg-2-trigger').click();
            const picker = await page.locator('#editor-colour-picker').boundingBox();
            assert.ok(picker.x >= 0 && picker.x + picker.width <= width);
            assert.ok(picker.y >= 0 && picker.y + picker.height <= 844);
            await page.keyboard.press('Escape');
        }
        await image('customize-mobile.png');
        assert.deepEqual(externalRequests, [], 'the customizer must not request remote assets');

        const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const touchPage = await touchContext.newPage();
        touchPage.on('pageerror', (error) => errors.push(error.message));
        await touchPage.goto(fileURL('customize.html'));
        await touchPage.waitForFunction(() => document.documentElement.dataset.customizerStatus === 'ready');
        await touchPage.locator('#color-accent-trigger').tap();
        assert.equal(await touchPage.evaluate(() => document.activeElement.id), 'editor-colour-picker', 'touch opening must not summon the keyboard');
        const hue = await touchPage.locator('#picker-hue').boundingBox();
        assert.ok(hue.height >= 28, 'the hue slider needs a usable touch target');
        const touchPlane = await touchPage.locator('.colour-plane').boundingBox();
        await touchPage.touchscreen.tap(touchPlane.x + touchPlane.width * .75, touchPlane.y + touchPlane.height * .25);
        assert.ok(Math.abs(Number(await touchPage.locator('#picker-s').inputValue()) - 75) <= 1);
        assert.ok(Math.abs(Number(await touchPage.locator('#picker-v').inputValue()) - 75) <= 1);
        await touchContext.close();
        console.log('PASS customizer: file://, settings, preview, copy/fallback, JSON, persistence, responsive layout, no external requests');

        // Execute the arguments from the generated command through npm itself.
        const output = path.join(temporary, 'custom.theme.css');
        const args = generated.split(' ').slice(1);
        const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args, '--output', output], { cwd: root, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr || result.error?.message);
        const css = await fs.readFile(output, 'utf8');
        assert.match(css, /@name Relay98 Discord Dark/);
        assert.doesNotMatch(css, /@import/);
        await page.setViewportSize({ width: 1920, height: 1080 });
        const themeURL = pathToFileURL(output).href;
        for (const scene of ['chat', 'friends', 'settings']) {
            await page.goto(`${fileURL(`demos/${scene}.html`)}?theme=${encodeURIComponent(themeURL)}`);
            await page.evaluate(() => window.demoReady);
            assert.equal(await page.evaluate(() => document.documentElement.dataset.demoStatus), 'ready');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${scene} overflow`);
            if (scene === 'chat') {
                const computed = await page.evaluate(() => {
                    const style = (selector) => getComputedStyle(document.querySelector(selector));
                    return {
                        fontSize: style('body').fontSize, codeSize: style('code').fontSize,
                        sidebar: style('.demo-sidebar').width, members: style('.demo-members').width,
                        radius: style('code').borderRadius, gap: style('.demo-message').marginBottom,
                        background: style('.demo-chat-content').backgroundColor,
                        texture: style('.demo-chat-content').backgroundImage,
                        bevel: style('.demo-composer').boxShadow,
                    };
                });
                assert.equal(await page.locator('.demo-avatar img').first().evaluate((node) => getComputedStyle(node).borderRadius), '50%');
                assert.deepEqual(computed, { fontSize: '20px', codeSize: '18px', sidebar: '288px', members: '264px', radius: '6px', gap: '12px', background: 'rgb(24, 41, 58)', texture: 'none', bevel: 'none' });
                await image('custom-theme-chat.png');
            }
        }
        const base = build({ output: path.join(temporary, 'original.theme.css'), quiet: true });
        for (const scene of ['chat', 'friends', 'settings']) {
            await page.goto(`${fileURL(`demos/${scene}.html`)}?theme=${encodeURIComponent(pathToFileURL(base.output).href)}`);
            await page.evaluate(() => window.demoReady);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `default ${scene} overflow`);
        }
        await page.goto(`${fileURL('demos/chat.html')}?theme=${encodeURIComponent(pathToFileURL(path.join(temporary, 'missing.css')).href)}`);
        await page.waitForFunction(() => document.documentElement.dataset.demoStatus === 'error');
        assert.match(await page.locator('.demo-error').textContent(), /Could not load theme/);
        assert.deepEqual(errors, []);
        console.log('PASS compiled theme: generated npm command, custom styles, all three default/custom demos, missing theme error');

        // Some browsers deny file:// localStorage; the page must still work.
        const blocked = await browser.newContext();
        await blocked.addInitScript(() => {
            Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
        });
        const fallback = await blocked.newPage();
        await fallback.goto(fileURL('customize.html'));
        await fallback.waitForFunction(() => document.documentElement.dataset.customizerStatus === 'ready');
        assert.match(await fallback.locator('#save-state').textContent(), /Session only/);
        assert.match(await fallback.locator('#build-command').inputValue(), /^npm run build/);
        console.log('PASS customizer with unavailable localStorage');
    } finally {
        await browser?.close();
        await fs.rm(temporary, { recursive: true, force: true });
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
