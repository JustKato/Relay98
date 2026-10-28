/* Local-only controls for the shared build configuration. */
(() => {
    'use strict';

    const api = window.Relay98Customization;
    const $ = (id) => document.getElementById(id);
    const storageKey = 'relay98-customizer-v1';
    const essentials = ['bg-2', 'bg-1', 'accent', 'text-1', 'titlebar-start', 'titlebar-end'];
    const fontKinds = { ui: 'Interface font', code: 'Code font' };
    let state;
    let storageAvailable = true;
    let copyPending = false;
    let feedbackTimer;

    function feedback(message, error = false) {
        clearTimeout(feedbackTimer);
        $('feedback').textContent = message;
        $('feedback').classList.toggle('error', error);
        if (message && !error) feedbackTimer = setTimeout(() => { $('feedback').textContent = ''; }, 7000);
    }

    function element(tag, attributes = {}, content) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
        if (content !== undefined) node.textContent = content;
        return node;
    }

    function persist() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
            storageAvailable = true;
        } catch {
            storageAvailable = false;
        }
        $('save-state').textContent = storageAvailable ? 'Saved on this device' : 'Session only · save JSON to keep';
    }

    function makePalettes() {
        for (const [key, palette] of Object.entries(api.palettes)) {
            const button = element('button', { type: 'button', class: 'palette-preset', 'data-palette': key, 'aria-pressed': 'false', 'aria-label': `${palette.label} palette` });
            const swatches = element('span', { class: 'preset-swatches', 'aria-hidden': 'true' });
            for (const color of ['bg-0', 'bg-2', 'accent', 'accent-light']) {
                const swatch = element('span');
                swatch.style.backgroundColor = palette.colors[color] || api.defaults.colors[color];
                swatches.append(swatch);
            }
            button.append(swatches, element('span', { class: 'preset-name' }, palette.label.split(/[·/]/)[0].trim()));
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
            const pickerId = `color-${color.key}`;
            const textId = `hex-${color.key}`;
            group.append(element('label', { for: textId }, color.label));
            const inputs = element('div', { class: 'color-inputs' });
            const picker = element('input', { type: 'color', id: pickerId, 'aria-label': `Choose ${color.label.toLowerCase()}` });
            const hex = element('input', { type: 'text', id: textId, maxlength: '7', spellcheck: 'false', autocomplete: 'off', 'aria-label': `${color.label}, hexadecimal colour` });
            picker.addEventListener('input', () => update((next) => { next.colors[color.key] = picker.value; }, hex));
            hex.addEventListener('change', () => {
                const value = hex.value.trim();
                update((next) => { next.colors[color.key] = value.startsWith('#') ? value : `#${value}`; }, hex);
            });
            inputs.append(picker, hex);
            group.append(inputs);
            $(essentials.includes(color.key) ? 'main-colors' : 'advanced-colors').append(group);
        }
        $('advanced-count').textContent = `(${api.colors.filter((color) => !essentials.includes(color.key)).length})`;
    }

    function makeFonts() {
        for (const [key, label] of Object.entries(fontKinds)) {
            const field = element('div', { class: 'font-field' });
            const select = element('select', { id: `font-${key}` });
            field.append(element('label', { for: select.id }, label));
            for (const [preset, font] of Object.entries(api.fontPresets)) select.append(element('option', { value: preset }, font.label));
            select.append(element('option', { value: 'custom' }, 'Custom font family…'));
            const custom = element('div', { class: 'custom-font-wrap', id: `font-custom-wrap-${key}`, hidden: '' });
            const input = element('input', { type: 'text', id: `font-custom-${key}`, maxlength: '240', placeholder: key === 'ui' ? 'e.g. Tahoma, sans-serif' : 'e.g. Consolas, monospace', spellcheck: 'false', autocomplete: 'off' });
            custom.append(element('label', { for: input.id, class: 'custom-font-label' }, 'Family or fallback list'), input);
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
            const range = element('input', { type: 'range', id: `range-${size.key}`, min: size.min, max: size.max, step: size.step, 'aria-label': `${size.label} in pixels` });
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

    function render() {
        $('theme-preview').removeAttribute('style');
        for (const [key, value] of Object.entries(api.toVariables(state))) $('theme-preview').style.setProperty(key, value);
        $('build-command').value = api.command(state);
        for (const button of document.querySelectorAll('[data-palette]')) button.setAttribute('aria-pressed', String(button.dataset.palette === state.palette));
        const preset = api.normalize({ palette: state.palette });
        const edited = api.colors.some(({ key }) => state.colors[key] !== preset.colors[key]);
        $('palette-state').textContent = `${api.palettes[state.palette].label.split(/[·/]/)[0].trim()}${edited ? ' · edited' : ''}`;
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
            feedback(`${error.message} The command still uses your last valid settings.`, true);
            return false;
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
            feedback('Command copied. Run it in the Relay98 project folder.');
        } catch {
            const command = $('build-command');
            command.focus();
            command.select();
            let copied = false;
            try { copied = document.execCommand('copy'); } catch { /* Manual selection is still available. */ }
            feedback(copied ? 'Command copied. Run it in the Relay98 project folder.' : 'Command selected. Press Ctrl+C (or ⌘C on Mac) to copy it.');
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
            if (file.size > 65536) throw new Error('Choose a settings JSON file smaller than 64 KB.');
            const next = api.normalize(JSON.parse(await file.text()));
            state = next;
            render();
            feedback(`Loaded ${file.name}. Your build command is ready.`);
        } catch (error) {
            feedback(`Could not load settings: ${error.message}`, true);
        } finally {
            input.value = '';
        }
    }

    try {
        if (!api) throw new Error('Could not load the workshop. Keep customize.html, customize.css, customize.js and the scripts folder together in the Relay98 project.');
        state = api.normalize(api.defaults);
        let restorationNotice = '';
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) state = api.normalize(JSON.parse(saved));
        } catch {
            restorationNotice = 'Saved settings could not be loaded. The original palette is ready to use.';
        }
        makePalettes();
        makeColors();
        makeFonts();
        makeSizes();
        $('theme-settings').addEventListener('submit', (event) => event.preventDefault());
        for (const input of document.querySelectorAll('[data-effect]')) input.addEventListener('change', () => update((next) => { next.effects[input.dataset.effect] = input.checked; }));
        $('google-fonts').addEventListener('change', () => update((next) => { next.googleFonts = $('google-fonts').checked; }));
        $('reset-settings').addEventListener('click', () => {
            state = api.normalize(api.defaults);
            render();
            feedback('Original Pine settings restored.');
        });
        $('copy-command').addEventListener('click', copyCommand);
        $('export-settings').addEventListener('click', () => {
            downloadJSON(state, 'relay98-settings.json');
            feedback('Settings saved as relay98-settings.json.');
        });
        $('export-spotifast').addEventListener('click', () => {
            downloadJSON(api.toSpotifast(state), 'relay98-custom.spotifast.json');
            feedback('Spotifast theme saved. Copy it into Spotifast\'s themes folder, then select it in Settings > Appearance > Theme.');
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
