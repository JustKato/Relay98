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
        const accentNames = ['Pine', 'Carbon paper', 'Copperwire', 'Diskette', 'Tidepool', 'Oxblood', 'Sandstone', 'Afterglow', 'Slate', 'Amberglass', '2004'];
        const accent = (name) => page.getByRole('radio', { name, exact: true });
        const rgb = (hex) => `rgb(${hex.slice(1).match(/../g).map((part) => parseInt(part, 16)).join(', ')})`;
        const contrast = (foreground, background) => {
            const luminance = (colour) => colour.match(/[\d.]+/g).slice(0, 3)
                .map((channel) => Number(channel) / 255)
                .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
                .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
            const levels = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
            return (levels[1] + .05) / (levels[0] + .05);
        };
        const buttonColours = (selector) => page.locator(selector).evaluate((node) => {
            const style = getComputedStyle(node);
            return { foreground: style.color, background: style.backgroundColor };
        });
        const showSetting = async (selector) => {
            const panel = await page.locator(selector).evaluate((node) => node.closest('.settings-page')?.id);
            if (panel && !(await page.locator(`#${panel}`).isVisible())) await page.locator(`.settings-tabs [aria-controls="${panel}"]`).click();
            const accordions = page.locator(selector).locator('xpath=ancestor::details');
            for (let index = 0; index < await accordions.count(); index++) {
                const accordion = accordions.nth(index);
                if (await accordion.getAttribute('open') === null) await accordion.locator('summary').first().click();
            }
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
        const toggle = async (selector, checked) => {
            await showSetting(selector);
            await page.locator(selector).setChecked(checked);
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
            const accentOverflows = await page.locator('#palette-presets [data-palette]').evaluateAll((tiles) => {
                const failures = [];
                for (const tile of tiles) {
                    const bounds = tile.getBoundingClientRect();
                    const inside = (rect) => rect.left >= bounds.left - .5 && rect.right <= bounds.right + .5 && rect.top >= bounds.top - .5 && rect.bottom <= bounds.bottom + .5;
                    for (const part of tile.querySelectorAll('.preset-swatches, .preset-swatches > span, .preset-name, .preset-check')) {
                        if (!inside(part.getBoundingClientRect())) failures.push(`${tile.dataset.palette}: ${part.className || 'swatch'} leaves its tile`);
                    }
                    // Text can paint outside a correctly sized flex/grid box.
                    const walker = document.createTreeWalker(tile.querySelector('.preset-name'), NodeFilter.SHOW_TEXT);
                    while (walker.nextNode()) {
                        const range = document.createRange();
                        range.selectNodeContents(walker.currentNode);
                        if ([...range.getClientRects()].some((rect) => rect.width && rect.height && !inside(rect))) {
                            failures.push(`${tile.dataset.palette}: label text leaves its tile`);
                        }
                    }
                    const swatches = tile.querySelector('.preset-swatches').getBoundingClientRect();
                    const check = tile.querySelector('.preset-check').getBoundingClientRect();
                    const separated = swatches.right <= check.left + .5 || check.right <= swatches.left + .5 || swatches.bottom <= check.top + .5 || check.bottom <= swatches.top + .5;
                    if (!separated) failures.push(`${tile.dataset.palette}: check marker covers its swatches`);
                }
                return failures;
            });
            assert.deepEqual(accentOverflows, [], `Accent tile overflow at ${width}px`);
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
        assert.equal(await page.locator('#theme-version').count(), 0);
        assert.equal(await page.locator('#palette-presets').getAttribute('role'), 'radiogroup');
        assert.equal(await page.locator('#palette-presets [data-palette]').count(), 11);
        for (const name of accentNames) assert.equal(await accent(name).count(), 1);
        assert.equal(await accent('Pine').getAttribute('aria-checked'), 'true');
        assert.equal(await accent('Pine').getAttribute('aria-describedby'), 'default-accent');
        assert.equal(await page.locator('#default-accent').textContent(), 'Default');
        assert.equal(await page.locator('#settings-colours > .section-heading .export-badge').textContent(), 'Palette JSON');
        assert.equal(await page.locator('label[for="hex-bg-2"] .export-badge').textContent(), 'Both apps');
        assert.equal(await page.locator('label[for="hex-titlebar-start"] .export-badge').textContent(), 'Both apps');
        assert.equal(await page.locator('label[for="hex-titlebar-end"] .export-badge').textContent(), 'Discord');
        for (const id of ['settings-type', 'settings-layout']) assert.equal(await page.locator(`#${id} .export-badge`).textContent(), 'Discord');
        const effectScopes = await page.locator('#settings-effects .export-badge').allTextContents();
        assert.ok(effectScopes.includes('Discord') && effectScopes.includes('Spotifast'));
        for (const id of ['effects-textures', 'effects-surfaces', 'effects-extras', 'effects-spotifast']) assert.equal(await page.locator(`#${id}`).getAttribute('open'), null);

        // Exercise the visible controls, including keyboard-only editing.
        await page.locator('#settings-tab-colours').press('End');
        assert.equal(await page.locator('#settings-effects').isVisible(), true);
        await page.locator('#settings-tab-effects').press('Home');
        assert.equal(await page.locator('#settings-colours').isVisible(), true);
        for (const [key, name] of [['ArrowRight', 'Carbon paper'], ['ArrowDown', 'Copperwire'], ['ArrowLeft', 'Carbon paper'], ['ArrowUp', 'Pine'], ['End', '2004'], ['ArrowRight', 'Pine'], ['End', '2004'], ['Home', 'Pine']]) {
            await page.locator('#palette-presets [aria-checked=true]').press(key);
            const selected = accent(name);
            assert.equal(await selected.getAttribute('aria-checked'), 'true', `${key} selects ${name}`);
            assert.equal(await selected.evaluate((node) => node === document.activeElement), true);
            assert.equal((await readConfig()).palette, await selected.getAttribute('data-palette'));
            assert.equal(await page.locator('#palette-presets [aria-checked=true]').count(), 1);
            assert.equal(await page.locator('#palette-presets [tabindex="0"]').count(), 1);
        }
        await showSetting('#avatar-shape');
        await page.locator('#avatar-shape-trigger').press('End');
        await page.locator('#avatar-shape-trigger').press('Enter');
        assert.equal((await readConfig()).avatarShape, 'round');
        await page.locator('#avatar-shape-trigger').press('Home');
        await page.locator('#avatar-shape-trigger').press('Escape');
        assert.equal((await readConfig()).avatarShape, 'round', 'Escape cancels a pending dropdown selection');
        await page.locator('#reset-settings').click();
        assert.equal(await page.locator('#avatar-shape-trigger').textContent(), 'Square');
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

        // Effects keep their app scope across edits, downloads and resets.
        await choose('#avatar-shape', 'round');
        await change('#size-fontSize', 18);
        const beforeEffects = await readConfig();
        const originalSpotifastStyle = await page.locator('#spotifast-preview').getAttribute('style');
        const originalTexture = await page.locator('.preview-chat').first().evaluate((node) => getComputedStyle(node).backgroundImage);
        await showSetting('#effect-value-glowRadius');
        assert.equal(await page.locator('#effect-value-glowRadius').isDisabled(), true);
        await toggle('#effect-gradient', false);
        await toggle('#effect-panelBorders', false);
        await toggle('#effect-messageDividers', true);
        await toggle('#effect-alternatingMessages', true);
        await toggle('#effect-textGlow', true);
        await change('#effect-value-textureStrength', 60);
        await change('#effect-value-textureScale', 150);
        await change('#effect-value-shadowOffset', 7);
        await change('#effect-value-glowRadius', 5);
        const discordEffects = await readConfig();
        assert.deepEqual(discordEffects.effectValues, { textureStrength: 60, textureScale: 150, shadowOffset: 7, glowRadius: 5 });
        assert.equal(await page.locator('.preview-title').evaluate((node) => getComputedStyle(node).backgroundColor), rgb(discordEffects.colors['titlebar-start']));
        assert.equal(await page.locator('.preview-sidebar').first().evaluate((node) => getComputedStyle(node).borderRightWidth), '0px');
        assert.equal(await page.locator('.sample-message').first().evaluate((node) => getComputedStyle(node).borderBottomWidth), '1px');
        assert.equal(await page.locator('.sample-message:nth-child(even)').first().evaluate((node) => getComputedStyle(node).backgroundColor), rgb(discordEffects.colors['bg-1']));
        assert.match(await page.locator('.message-content > p:not(.message-meta)').first().evaluate((node) => getComputedStyle(node).textShadow), /5px/);
        assert.match(await page.locator('.sample-embed').first().evaluate((node) => getComputedStyle(node).boxShadow), /7px 7px/);
        assert.notEqual(await page.locator('.preview-chat').first().evaluate((node) => getComputedStyle(node).backgroundImage), originalTexture);
        assert.equal(await page.locator('.preview-sidebar').first().evaluate((node) => getComputedStyle(node).backgroundSize), '9px 9px');
        assert.equal(await page.locator('#spotifast-preview').getAttribute('style'), originalSpotifastStyle, 'Discord effects leave the Spotifast preview unchanged');
        assert.deepEqual(customization.toSpotifast(discordEffects), customization.toSpotifast(beforeEffects));
        assert.deepEqual(customization.toPalette(discordEffects), customization.toPalette(beforeEffects));

        await showSetting('#effect-range-textureStrength');
        await page.locator('#effect-range-textureStrength').focus();
        await page.locator('#effect-range-textureStrength').press('Home');
        assert.equal(await page.locator('#effect-value-textureStrength').inputValue(), '0');
        assert.equal(await page.locator('.preview-chat').first().evaluate((node) => getComputedStyle(node).backgroundImage), 'none');
        await change('#effect-value-textureStrength', 60);
        const validEffectsCommand = await command();
        await change('#effect-value-textureScale', 999);
        assert.equal(await page.locator('#effect-value-textureScale').getAttribute('aria-invalid'), 'true');
        assert.equal(await command(), validEffectsCommand);
        await change('#effect-value-textureScale', 150);

        const discordStyle = await page.locator('#theme-preview').getAttribute('style');
        await toggle('#spotifast-tint', false);
        await toggle('#spotifast-shadows', false);
        assert.equal(await page.locator('#spotifast-tintStrength').isDisabled(), true);
        assert.equal(await page.locator('#spotifast-shadowStrength').isDisabled(), true);
        await page.locator('#preview-spotifast-popup').click();
        assert.equal(await page.locator('#spotifast-popup').isVisible(), true);
        const noPopupShadow = await page.locator('#spotifast-popup').evaluate((node) => getComputedStyle(node).boxShadow);
        assert.ok(noPopupShadow === 'none' || /rgba\([^)]*, 0\)/.test(noPopupShadow), 'disabling popup shadows removes their visible opacity');
        await toggle('#spotifast-tint', true);
        await toggle('#spotifast-shadows', true);
        await toggle('#spotifast-solidPopups', true);
        await change('#spotifast-tintStrength', 160);
        await change('#spotifast-shadowStrength', 140);
        await showSetting('#spotifast-outlines');
        const outlinesTrigger = page.locator('#spotifast-outlines-trigger');
        const selectPopup = page.locator('#editor-select-list');
        await outlinesTrigger.evaluate((node) => window.scrollTo(0, scrollY + node.getBoundingClientRect().top - innerHeight + 100));
        await page.waitForFunction(() => Math.abs(document.getElementById('spotifast-outlines-trigger').getBoundingClientRect().top - innerHeight + 100) < 1);
        const beforeOpenScroll = await page.evaluate(() => scrollY);
        await outlinesTrigger.click();
        assert.equal(await selectPopup.isVisible(), true);
        assert.equal(await page.evaluate(() => scrollY), beforeOpenScroll, 'highlighting the selected option does not scroll the page');
        const openPosition = await selectPopup.boundingBox();
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => {
            document.dispatchEvent(new Event('scroll'));
            resolve();
        })));
        assert.equal(await selectPopup.isVisible(), true, 'a delayed scroll event keeps a stationary dropdown open');
        assert.deepEqual(await selectPopup.boundingBox(), openPosition);
        await page.evaluate(() => new Promise((resolve) => {
            window.scrollBy(0, 32);
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        }));
        assert.equal(await selectPopup.isVisible(), true, 'a dropdown follows its visible control during scroll');
        const movedPosition = await selectPopup.boundingBox();
        assert.ok(Math.abs(movedPosition.y - openPosition.y + 32) < 1, 'popup stays anchored after a small scroll');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => document.getElementById('editor-select-list').hidden);
        assert.equal(await outlinesTrigger.getAttribute('aria-expanded'), 'false', 'scrolling the control offscreen closes its dropdown');
        await choose('#spotifast-outlines', 'none');
        assert.match(await page.locator('.sf-player').evaluate((node) => getComputedStyle(node).borderTopColor), /, 0\)$/);
        await choose('#spotifast-outlines', 'accent');
        await choose('#spotifast-accentStyle', 'neutral');
        assert.equal(await page.locator('#spotifast-panelTint').isDisabled(), true);
        await choose('#spotifast-panels', 'tinted');
        await change('#spotifast-panelTint', 35);
        const scopedEffects = await readConfig();
        assert.match(await page.locator('#spotifast-popup').evaluate((node) => getComputedStyle(node).backgroundColor), /^rgb\(/, 'solid popups use an opaque colour');
        assert.notEqual(await page.locator('#spotifast-popup').evaluate((node) => getComputedStyle(node).boxShadow), noPopupShadow);
        assert.deepEqual(scopedEffects.spotifast, {
            tint: true, tintStrength: 160, shadows: true, shadowStrength: 140,
            solidPopups: true, outlines: 'accent', accentStyle: 'neutral', panels: 'tinted', panelTint: 35,
        });
        assert.equal(await page.locator('#theme-preview').getAttribute('style'), discordStyle, 'Spotifast controls leave the Discord preview unchanged');
        assert.deepEqual(customization.toVariables(scopedEffects), customization.toVariables(discordEffects));
        assert.deepEqual(customization.toPalette(scopedEffects), customization.toPalette(beforeEffects));
        assert.notDeepEqual(customization.toSpotifast(scopedEffects), customization.toSpotifast(beforeEffects));
        assert.equal(await page.locator('.sf-player').evaluate((node) => getComputedStyle(node).backgroundColor), rgb(customization.toSpotifast(scopedEffects).colors.panel));
        assert.equal(await page.locator('.sf-play.small').evaluate((node) => getComputedStyle(node).backgroundColor), rgb(customization.toSpotifast(scopedEffects).colors.accent));
        const validSpotifastCommand = await command();
        await change('#spotifast-panelTint', 99);
        assert.equal(await page.locator('#spotifast-panelTint').getAttribute('aria-invalid'), 'true');
        assert.equal(await command(), validSpotifastCommand);
        await change('#spotifast-panelTint', 35);

        const effectsSettings = await downloadJSON('#export-settings');
        assert.deepEqual(effectsSettings.value, scopedEffects);
        const effectsSpotifast = await downloadJSON('#export-spotifast');
        assert.deepEqual(effectsSpotifast.value, customization.toSpotifast(scopedEffects));
        const effectsPalette = await downloadJSON('#export-palette');
        assert.deepEqual(effectsPalette.value, customization.toPalette(beforeEffects));
        await page.reload();
        await page.waitForFunction(() => document.documentElement.dataset.customizerStatus === 'ready');
        assert.deepEqual(await readConfig(), scopedEffects, 'app-specific effects survive a reload');
        await showSetting('#effect-value-glowRadius');
        assert.equal(await page.locator('#effect-value-glowRadius').inputValue(), '5');
        await showSetting('#spotifast-panelTint');
        assert.equal(await page.locator('#spotifast-panelTint').inputValue(), '35');
        await showSetting('#reset-discord-effects');
        await page.locator('#reset-discord-effects').click();
        const discordReset = { ...scopedEffects, effects: customization.defaults.effects, effectValues: customization.defaults.effectValues };
        assert.deepEqual(await readConfig(), discordReset, 'Discord reset preserves Spotifast and other settings');
        await toggle('#effect-textGlow', true);
        const beforeSpotifastReset = await readConfig();
        await showSetting('#reset-spotifast-effects');
        await page.locator('#reset-spotifast-effects').click();
        assert.deepEqual(await readConfig(), { ...beforeSpotifastReset, spotifast: customization.defaults.spotifast }, 'Spotifast reset preserves Discord and other settings');
        await page.locator('#import-file').setInputFiles(effectsSettings.file);
        await page.waitForFunction(() => document.getElementById('feedback').textContent.startsWith('Loaded '));
        assert.deepEqual(await readConfig(), scopedEffects, 'settings import restores both effect scopes');
        await page.locator('#reset-settings').click();
        assert.deepEqual(await readConfig(), customization.defaults);
        await page.locator('#tab-discord').click();
        console.log('PASS effects: Discord and Spotifast previews, ranges, app scope, JSON, persistence, scoped resets');

        // Load legacy Discord settings.
        const legacySettings = { variant: 'discord', palette: 'discord', avatarShape: 'round' };
        await page.locator('#import-file').setInputFiles({ name: 'legacy-discord-settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacySettings)) });
        await page.waitForFunction(() => document.getElementById('feedback').textContent.startsWith('Loaded legacy-discord-settings.json'));
        assert.deepEqual(await readConfig(), customization.normalize(legacySettings));
        assert.equal((await readConfig()).variant, 'discord');
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
        const nonColourSettings = ({ variant, palette, colors, ...settings }) => settings;
        const beforeAccents = await readConfig();
        await showSetting('#hex-bg-2');
        for (const name of accentNames) {
            await accent(name).click();
            const selected = await readConfig();
            const key = await accent(name).getAttribute('data-palette');
            assert.equal(selected.variant, 'original');
            assert.equal(selected.palette, key);
            assert.deepEqual(nonColourSettings(selected), nonColourSettings(beforeAccents), `${name} preserves fonts, layout, avatars and effects`);
            assert.deepEqual(selected.colors, customization.palettes[key].colors);
            assert.equal(await page.locator('#theme-preview').evaluate((node) => getComputedStyle(node).backgroundColor), rgb(selected.colors['bg-2']));
            assert.equal(await page.locator('#theme-preview').evaluate((node) => node.style.getPropertyValue('--r98-accent')), selected.colors.accent);
            assert.equal(await page.locator('.sf-player').evaluate((node) => getComputedStyle(node).backgroundColor), rgb(customization.toSpotifast(selected).colors.panel));
            assert.equal(await accent(name).getAttribute('aria-checked'), 'true');
        }
        await change('#hex-bg-2', '#18293a');
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
        await page.locator('#copy-command').hover();
        const copyColours = await buttonColours('#copy-command');
        const copyContrast = contrast(copyColours.foreground, copyColours.background);
        assert.ok(copyContrast >= 4.5, `Copy hover contrast is ${copyContrast.toFixed(2)}:1`);
        console.log(`PASS Copy hover contrast: ${copyContrast.toFixed(2)}:1 (${copyColours.foreground} on ${copyColours.background})`);
        await page.locator('#copy-command').click();
        assert.equal(await page.evaluate(() => window.testCopied), generated);
        await page.evaluate(() => {
            navigator.clipboard.writeText = async () => { throw new Error('Permission denied'); };
            document.execCommand = () => false;
        });
        await page.locator('#copy-command').click();
        assert.match(await page.locator('#feedback').textContent(), /Command selected/);
        assert.equal(await page.locator('#build-command').evaluate((node) => node.selectionEnd - node.selectionStart), generated.length);

        // Invalid edits must preserve the last valid configuration.
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
        assert.equal(await page.locator('#palette-presets [aria-checked=true]').getAttribute('data-palette'), config.palette);
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

        // Run the generated command through npm.
        const output = path.join(temporary, 'custom.theme.css');
        const args = generated.split(' ').slice(1);
        const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args, '--output', output], { cwd: root, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr || result.error?.message);
        const css = await fs.readFile(output, 'utf8');
        assert.equal(css.match(/@name\s+([^\r\n]+)/)?.[1].trim(), 'Relay98 Custom');
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
            } else if (scene === 'settings') {
                const normal = await buttonColours('.demo-button--primary');
                const normalContrast = contrast(normal.foreground, normal.background);
                await page.locator('.demo-button--primary').hover();
                const hover = await buttonColours('.demo-button--primary');
                const hoverContrast = contrast(hover.foreground, hover.background);
                assert.ok(normalContrast >= 4.5, `2004 compiled button contrast is ${normalContrast.toFixed(2)}:1`);
                assert.ok(hoverContrast >= 4.5, `2004 compiled hover contrast is ${hoverContrast.toFixed(2)}:1`);
                console.log(`PASS 2004 compiled button contrast: ${normalContrast.toFixed(2)}:1 normal, ${hoverContrast.toFixed(2)}:1 hover`);
            }
        }
        // Exercise exported effect rules against the same Discord attributes used by the demo.
        const extrasConfig = customization.normalize({
            ...scopedEffects,
            effects: { ...Object.fromEntries(Object.keys(scopedEffects.effects).map((key) => [key, true])), panelBorders: false },
        });
        const extras = build({ custom: extrasConfig, output: path.join(temporary, 'effects.theme.css'), quiet: true });
        await page.goto(`${fileURL('demos/chat.html')}?theme=${encodeURIComponent(pathToFileURL(extras.output).href)}`);
        await page.evaluate(() => window.demoReady);
        const effectStyle = (selector, property) => page.locator(selector).first().evaluate((node, name) => getComputedStyle(node)[name], property);
        assert.equal(await effectStyle('.demo-sidebar', 'borderRightWidth'), '0px');
        assert.equal(await effectStyle('#chat-messages-general-1', 'borderBottomWidth'), '1px');
        assert.equal(await effectStyle('#chat-messages-general-1', 'borderBottomColor'), rgb(extrasConfig.colors.border));
        assert.equal(await effectStyle('#chat-messages-general-2', 'backgroundColor'), rgb(extrasConfig.colors['bg-1']));
        const glow = `${rgb(extrasConfig.colors['accent-light'])} 0px 0px 5px`;
        assert.equal(await effectStyle('#chat-messages-general-1 .markup__75297', 'textShadow'), glow);
        assert.equal(await effectStyle('.demo-titlebar .title_c38106', 'textShadow'), glow);
        assert.equal(await effectStyle('.demo-message-heading', 'textShadow'), 'none', 'message glow leaves author metadata unchanged');
        assert.equal(await effectStyle('.demo-channel-welcome p', 'textShadow'), 'none', 'message glow stays scoped to chat markup');
        assert.equal(await effectStyle('.demo-sidebar', 'backgroundSize'), '9px 9px');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'effects demo overflow');
        await image('custom-effects-chat.png');
        console.log('PASS compiled effects: message dividers, alternating backgrounds, scoped glow, panel borders and texture scale');

        const base = build({ output: path.join(temporary, 'original.theme.css'), quiet: true });
        for (const scene of ['chat', 'friends', 'settings']) {
            await page.goto(`${fileURL(`demos/${scene}.html`)}?theme=${encodeURIComponent(pathToFileURL(base.output).href)}`);
            await page.evaluate(() => window.demoReady);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `default ${scene} overflow`);
            if (scene === 'chat') {
                assert.equal(await effectStyle('#chat-messages-general-1', 'borderBottomWidth'), '0px');
                assert.equal(await effectStyle('#chat-messages-general-2', 'backgroundColor'), 'rgba(0, 0, 0, 0)');
                assert.equal(await effectStyle('#chat-messages-general-1 .markup__75297', 'textShadow'), 'none');
                assert.equal(await effectStyle('#chat-messages-general-1', 'marginBottom'), '4px');
                assert.equal(await effectStyle('#chat-messages-general-1 .markup__75297', 'fontSize'), '16px');
            }
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
