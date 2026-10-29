/* Local-only controls for the shared build configuration. */
(() => {
    'use strict';

    const api = window.Relay98Customization;
    const $ = (id) => document.getElementById(id);
    const storageKey = 'relay98-customizer-v1';
    const viewKey = 'relay98-customizer-view';
    const essentials = ['bg-2', 'bg-1', 'accent', 'text-1', 'titlebar-start', 'titlebar-end'];
    const fontKinds = { ui: 'Interface', code: 'Code' };
    const pages = {
        discord: { chat: 'Chat', friends: 'Friends' },
        spotifast: { home: 'Home', liked: 'Liked Songs' },
    };
    const notes = {
        discord: 'Sample layout. Panel widths are scaled down to fit.',
        spotifast: 'Spotifast uses the colours only. Fonts, sizes and effects apply to Discord.',
    };
    let state;
    let view = { app: 'discord', page: 'chat' };
    let copyPending = false;
    let feedbackTimer;

    function feedback(message, error = false) {
        clearTimeout(feedbackTimer);
        $('feedback').textContent = message;
        $('feedback').classList.toggle('error', error);
        if (message && !error) feedbackTimer = setTimeout(() => { $('feedback').textContent = ''; }, 6000);
    }

    function element(tag, attributes = {}, content) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
        if (content !== undefined) node.textContent = content;
        return node;
    }

    function paletteName(key) {
        return api.palettes[key].label.split(/[·/]/)[0].trim();
    }

    function persist() {
        let saved = true;
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
            saved = false;
        }
        $('save-state').textContent = saved ? 'Saved in this browser' : 'Session only · use Save to keep';
    }

    function makePalettes() {
        for (const key of api.paletteOptions) {
            const palette = api.palettes[key];
            const button = element('button', { type: 'button', class: 'palette-preset', 'data-palette': key, 'aria-pressed': 'false' });
            const swatches = element('span', { class: 'preset-swatches', 'aria-hidden': 'true' });
            for (const color of ['bg-0', 'bg-2', 'accent', 'accent-light']) {
                const swatch = element('span');
                swatch.style.backgroundColor = palette.colors[color] || api.defaults.colors[color];
                swatches.append(swatch);
            }
            button.append(swatches, element('span', {}, paletteName(key)));
            button.addEventListener('click', () => update((next) => {
                next.palette = key;
                next.colors = { ...palette.colors };
            }));
            $('palette-presets').append(button);
        }
    }

    function makeColors() {
        const ordered = [...essentials.map((key) => api.colors.find((color) => color.key === key)).filter(Boolean), ...api.colors.filter((color) => !essentials.includes(color.key))];
        for (const color of ordered) {
            const group = element('div', { class: 'color-control' });
            const hexId = `hex-${color.key}`;
            group.append(element('label', { for: hexId, title: color.label }, color.label));
            const inputs = element('div', { class: 'color-inputs' });
            const picker = element('input', { type: 'color', id: `color-${color.key}`, 'aria-label': `Pick ${color.label.toLowerCase()}` });
            const hex = element('input', { type: 'text', id: hexId, maxlength: '7', spellcheck: 'false', autocomplete: 'off' });
            picker.addEventListener('input', () => update((next) => { next.colors[color.key] = picker.value; }, hex));
            hex.addEventListener('change', () => {
                const value = hex.value.trim();
                update((next) => { next.colors[color.key] = value.startsWith('#') ? value : `#${value}`; }, hex);
            });
            inputs.append(picker, hex);
            group.append(inputs);
            $(essentials.includes(color.key) ? 'main-colors' : 'advanced-colors').append(group);
        }
        $('advanced-count').textContent = `(${api.colors.length - essentials.length} more)`;
    }

    function makeFonts() {
        for (const [key, label] of Object.entries(fontKinds)) {
            const field = element('div', { class: 'field' });
            const select = element('select', { id: `font-${key}` });
            field.append(element('label', { for: select.id }, label));
            for (const [preset, font] of Object.entries(api.fontPresets)) select.append(element('option', { value: preset }, font.label));
            select.append(element('option', { value: 'custom' }, 'Custom…'));
            const custom = element('div', { class: 'custom-font', id: `font-custom-wrap-${key}`, hidden: '' });
            const input = element('input', { type: 'text', id: `font-custom-${key}`, maxlength: '240', placeholder: key === 'ui' ? 'Tahoma, sans-serif' : 'Consolas, monospace', spellcheck: 'false', autocomplete: 'off', 'aria-label': `${label} font family` });
            custom.append(input);
            select.addEventListener('change', () => {
                if (select.value === 'custom') {
                    custom.hidden = false;
                    input.value = state.fonts[key];
                    input.focus();
                    input.select();
                } else {
                    update((next) => { next.fonts[key] = api.fontPresets[select.value][key]; }, input);
                }
            });
            input.addEventListener('change', () => update((next) => { next.fonts[key] = input.value.trim(); }, input));
            field.append(select, custom);
            $('font-fields').append(field);
        }
    }

    function makeSizes() {
        for (const size of api.sizes) {
            const group = element('div', { class: 'size-control' });
            const range = element('input', { type: 'range', id: `range-${size.key}`, min: size.min, max: size.max, step: size.step });
            const number = element('input', { type: 'number', id: `size-${size.key}`, min: size.min, max: size.max, step: size.step, 'aria-label': `${size.label} in pixels` });
            const value = element('div', { class: 'size-value' });
            value.append(number, element('span', { class: 'size-unit', 'aria-hidden': 'true' }, 'px'));
            group.append(element('label', { for: range.id }, size.label), range, value);
            range.addEventListener('input', () => update((next) => { next.sizes[size.key] = Number(range.value); }, number));
            number.addEventListener('change', () => {
                if (number.value === '') {
                    number.setAttribute('aria-invalid', 'true');
                    feedback(`${size.label} needs a number from ${size.min} to ${size.max}.`, true);
                    return;
                }
                update((next) => { next.sizes[size.key] = Number(number.value); }, number);
            });
            $('size-controls').append(group);
        }
    }

    function makePatterns() {
        for (const pattern of api.patterns) {
            const row = element('label', { class: 'switch-row' });
            const text = element('span');
            text.append(element('strong', {}, pattern.label), element('small', {}, pattern.hint));
            row.append(text, element('input', { type: 'checkbox', id: `effect-${pattern.key}`, 'data-effect': pattern.key, role: 'switch' }), element('span', { class: 'switch', 'aria-hidden': 'true' }));
            $('pattern-toggles').append(row);
        }
        $('patterns-all').addEventListener('change', () => {
            const on = $('patterns-all').checked;
            update((next) => { for (const { key } of api.patterns) next.effects[key] = on; });
        });
    }

    function renderPatterns() {
        const on = api.patterns.filter(({ key }) => state.effects[key]).length;
        const master = $('patterns-all');
        // A mixed state counts as on, so one click clears every pattern.
        master.checked = on > 0;
        master.indeterminate = on > 0 && on < api.patterns.length;
        master.setAttribute('aria-checked', master.indeterminate ? 'mixed' : String(master.checked));
        $('pattern-summary').textContent = on === api.patterns.length ? 'All on' : on === 0 ? 'All off' : `${on} of ${api.patterns.length} on`;
    }

    function render() {
        const preview = $('theme-preview');
        preview.removeAttribute('style');
        for (const [key, value] of Object.entries(api.toVariables(state))) preview.style.setProperty(key, value);
        const spotifast = $('spotifast-preview');
        spotifast.removeAttribute('style');
        for (const [key, value] of Object.entries(api.toSpotifast(state).colors)) spotifast.style.setProperty(`--sf-${key.replace(/_/g, '-')}`, value);

        $('build-command').value = api.command(state);
        $('theme-version').value = state.variant;
        $('avatar-shape').value = state.avatarShape;
        for (const button of document.querySelectorAll('[data-palette]')) button.setAttribute('aria-pressed', String(button.dataset.palette === state.palette));
        const preset = api.normalize({ palette: state.palette });
        const edited = api.colors.some(({ key }) => state.colors[key] !== preset.colors[key]);
        $('palette-state').textContent = `${paletteName(state.palette)}${edited ? ' · edited' : ''}`;
        for (const { key } of api.colors) {
            $(`color-${key}`).value = state.colors[key];
            $(`hex-${key}`).value = state.colors[key].toUpperCase();
            $(`hex-${key}`).removeAttribute('aria-invalid');
        }
        for (const { key } of api.sizes) {
            $(`range-${key}`).value = state.sizes[key];
            $(`range-${key}`).setAttribute('aria-valuetext', `${state.sizes[key]} pixels`);
            $(`size-${key}`).value = state.sizes[key];
            $(`size-${key}`).removeAttribute('aria-invalid');
        }
        for (const key of Object.keys(fontKinds)) {
            const matched = Object.entries(api.fontPresets).find(([, font]) => font[key] === state.fonts[key]);
            $(`font-${key}`).value = matched ? matched[0] : 'custom';
            $(`font-custom-wrap-${key}`).hidden = Boolean(matched);
            $(`font-custom-${key}`).value = state.fonts[key];
            $(`font-custom-${key}`).removeAttribute('aria-invalid');
        }
        for (const [key, value] of Object.entries(state.effects)) $(`effect-${key}`).checked = value;
        renderPatterns();
        $('google-fonts').checked = state.googleFonts;
        persist();
    }

    function update(change, input) {
        try {
            const next = JSON.parse(JSON.stringify(state));
            change(next);
            state = api.normalize(next);
            render();
            if ($('feedback').classList.contains('error')) feedback('');
            return true;
        } catch (error) {
            if (input) input.setAttribute('aria-invalid', 'true');
            feedback(`${error.message} The build command still uses your last valid settings.`, true);
            return false;
        }
    }

    function selectTab(tab, focus) {
        tab.parentElement.querySelectorAll('[role=tab]').forEach((other) => {
            const selected = other === tab;
            other.setAttribute('aria-selected', String(selected));
            other.tabIndex = selected ? 0 : -1;
        });
        if (focus) tab.focus();
    }

    // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
    function tabKeys(list, activate) {
        list.addEventListener('keydown', (event) => {
            const tabs = [...list.querySelectorAll('[role=tab]')];
            const index = tabs.indexOf(document.activeElement);
            if (index < 0) return;
            const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: tabs.length - 1 - index };
            if (!(event.key in moves)) return;
            event.preventDefault();
            activate(tabs[(index + moves[event.key] + tabs.length) % tabs.length], true);
        });
    }

    function showView(next, focus) {
        if (!pages[next.app]) next = { app: 'discord', page: 'chat' };
        if (!pages[next.app][next.page]) next.page = Object.keys(pages[next.app])[0];
        view = next;
        selectTab($(`tab-${view.app}`));
        $('theme-preview').hidden = view.app !== 'discord';
        $('spotifast-preview').hidden = view.app !== 'spotifast';
        const pageTabs = $('page-tabs');
        pageTabs.replaceChildren();
        for (const [key, label] of Object.entries(pages[view.app])) {
            const tab = element('button', { type: 'button', role: 'tab', 'data-page': key }, label);
            tab.addEventListener('click', () => showView({ app: view.app, page: key }));
            pageTabs.append(tab);
            if (key === view.page) selectTab(tab, focus === 'page');
        }
        const container = view.app === 'discord' ? $('theme-preview') : $('spotifast-preview');
        for (const page of container.querySelectorAll('.preview-body, .sf-page')) page.hidden = page.dataset.page !== view.page;
        if (view.app === 'discord') $('discord-title').textContent = container.querySelector(`[data-page="${view.page}"]`).dataset.title;
        for (const link of document.querySelectorAll('[data-sf-link]')) link.classList.toggle('active', link.dataset.sfLink === view.page);
        $('preview-note').textContent = notes[view.app];
        if (focus === 'app') $(`tab-${view.app}`).focus();
        try { localStorage.setItem(viewKey, JSON.stringify(view)); } catch { /* View choice is optional. */ }
    }

    function makeTabs() {
        for (const tab of document.querySelectorAll('#app-tabs [role=tab]')) {
            tab.addEventListener('click', () => showView({ app: tab.dataset.app, page: '' }));
        }
        tabKeys($('app-tabs'), (tab) => showView({ app: tab.dataset.app, page: '' }, 'app'));
        tabKeys($('page-tabs'), (tab) => showView({ app: view.app, page: tab.dataset.page }, 'page'));
        try {
            const saved = JSON.parse(localStorage.getItem(viewKey));
            if (saved && typeof saved.app === 'string' && typeof saved.page === 'string') view = saved;
        } catch { /* Fall back to the chat page. */ }
        showView(view);
    }

    // Album art is optional. Covers without a matching file keep the gradient.
    function loadCovers() {
        for (const cover of document.querySelectorAll('[data-cover]')) {
            const image = element('img', { alt: '', src: `demos/images/spotifast/${cover.dataset.cover}` });
            image.addEventListener('error', () => image.remove());
            cover.prepend(image);
        }
    }

    async function copyCommand() {
        if (copyPending) return;
        copyPending = true;
        const button = $('copy-command');
        button.disabled = true;
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText($('build-command').value);
            feedback('Copied. Paste it into a terminal in the Relay98 folder.');
            button.textContent = 'Copied';
            setTimeout(() => { button.textContent = 'Copy'; }, 1500);
        } catch {
            const command = $('build-command');
            command.focus();
            command.select();
            let copied = false;
            try { copied = document.execCommand('copy'); } catch { /* Manual selection is still available. */ }
            feedback(copied ? 'Copied. Paste it into a terminal in the Relay98 folder.' : 'Command selected. Press Ctrl+C (⌘C on Mac) to copy it.');
        } finally {
            copyPending = false;
            button.disabled = false;
        }
    }

    function downloadJSON(value, filename) {
        const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = element('a', { href: url, download: filename });
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function importSettings() {
        const input = $('import-file');
        const file = input.files[0];
        if (!file) return;
        try {
            if (file.size > 65536) throw new Error('The file is larger than 64 KB.');
            const settings = JSON.parse(await file.text());
            if (settings && typeof settings === 'object' && Object.hasOwn(settings, 'base') && Object.hasOwn(settings, 'colors')) {
                throw new Error('That is an exported palette. Load relay98-settings.json to continue editing.');
            }
            state = api.normalize(settings);
            render();
            feedback(`Loaded ${file.name}.`);
        } catch (error) {
            feedback(`Could not load settings: ${error.message}`, true);
        } finally {
            input.value = '';
        }
    }

    try {
        if (!api) throw new Error('Could not load scripts/customization.js. Open this page from the Relay98 folder.');
        state = api.normalize(api.defaults);
        let restorationNotice = '';
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) state = api.normalize(JSON.parse(saved));
        } catch {
            restorationNotice = 'Your saved settings could not be loaded, so the defaults are shown.';
        }
        for (const [key, variant] of Object.entries(api.variants)) $('theme-version').append(element('option', { value: key }, variant.label.replace(/^Relay98 /, '')));
        for (const [key, shape] of Object.entries(api.avatarShapes)) $('avatar-shape').append(element('option', { value: key }, shape.label));
        $('theme-version').addEventListener('change', () => update((next) => {
            const key = $('theme-version').value;
            const variant = api.variants[key];
            next.variant = key;
            next.palette = variant.palette;
            next.colors = { ...api.palettes[variant.palette].colors };
            next.avatarShape = variant.avatarShape;
        }));
        $('avatar-shape').addEventListener('change', () => update((next) => { next.avatarShape = $('avatar-shape').value; }));
        makePalettes();
        makeColors();
        makeFonts();
        makeSizes();
        makePatterns();
        makeTabs();
        loadCovers();
        $('theme-settings').addEventListener('submit', (event) => event.preventDefault());
        for (const input of document.querySelectorAll('[data-effect]')) input.addEventListener('change', () => update((next) => { next.effects[input.dataset.effect] = input.checked; }));
        $('google-fonts').addEventListener('change', () => update((next) => { next.googleFonts = $('google-fonts').checked; }));
        $('reset-settings').addEventListener('click', () => {
            state = api.normalize(api.defaults);
            render();
            feedback('Defaults restored.');
        });
        $('copy-command').addEventListener('click', copyCommand);
        $('export-settings').addEventListener('click', () => {
            downloadJSON(state, 'relay98-settings.json');
            feedback('Saved relay98-settings.json.');
        });
        $('export-spotifast').addEventListener('click', () => {
            downloadJSON(api.toSpotifast(state), 'relay98-custom.spotifast.json');
            feedback('Saved relay98-custom.spotifast.json. Put it in Spotifast\'s themes folder.');
        });
        $('export-palette').addEventListener('click', () => {
            downloadJSON(api.toPalette(state), 'relay98-custom.palette.json');
            feedback('Saved relay98-custom.palette.json.');
        });
        $('import-settings').addEventListener('click', () => $('import-file').click());
        $('import-file').addEventListener('change', importSettings);
        render();
        if (restorationNotice) feedback(restorationNotice);
        document.documentElement.dataset.customizerStatus = 'ready';
    } catch (error) {
        $('fatal-error').hidden = false;
        $('fatal-error').textContent = error.message;
        document.documentElement.dataset.customizerStatus = 'error';
    }
})();
