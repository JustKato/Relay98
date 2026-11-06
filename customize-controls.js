/* Custom controls read and write the native form fields. */
(() => {
    'use strict';

    const selects = new Map();
    const colours = new Map();
    let active;
    let listbox;
    let picker;
    let colourState;
    let writingColour = false;
    let typeahead = '';
    let typeaheadTime = 0;

    function node(tag, attributes = {}, text) {
        const result = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) result.setAttribute(key, value);
        if (text !== undefined) result.textContent = text;
        return result;
    }

    function close(restoreFocus = false) {
        if (!active) return;
        // Outside pointerdown precedes blur/change; save the typed colour before closing.
        const focused = document.activeElement;
        if (active.kind === 'colour' && picker.contains(focused) && focused.matches('input[type=text], input[type=number]')) {
            focused.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const { trigger, panel } = active;
        panel.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        trigger.removeAttribute('aria-activedescendant');
        active = undefined;
        typeahead = '';
        if (restoreFocus) trigger.focus({ preventScroll: true });
    }

    function position() {
        if (!active) return;
        const { trigger, panel } = active;
        const rect = trigger.getBoundingClientRect();
        const viewport = window.visualViewport;
        const leftEdge = viewport?.offsetLeft || 0;
        const topEdge = viewport?.offsetTop || 0;
        const width = viewport?.width || innerWidth;
        const height = viewport?.height || innerHeight;
        const gap = 6;
        const margin = 10;
        panel.style.width = `${Math.min(active.kind === 'select' ? Math.max(rect.width, 180) : 280, width - margin * 2)}px`;
        panel.style.maxHeight = `${height - margin * 2}px`;
        const box = panel.getBoundingClientRect();
        const below = topEdge + height - rect.bottom - gap - margin;
        const above = rect.top - topEdge - gap - margin;
        const useAbove = below < box.height && above > below;
        const available = Math.max(above, below);
        if (active.kind === 'select') panel.style.maxHeight = `${Math.max(44, Math.min(280, available))}px`;
        const finalHeight = panel.getBoundingClientRect().height;
        const top = useAbove ? rect.top - gap - finalHeight : rect.bottom + gap;
        panel.style.left = `${Math.max(leftEdge + margin, Math.min(rect.left, leftEdge + width - box.width - margin))}px`;
        panel.style.top = `${Math.max(topEdge + margin, Math.min(top, topEdge + height - finalHeight - margin))}px`;
    }

    function refreshSelect(native) {
        const control = selects.get(native);
        control.value.textContent = native.selectedOptions[0]?.textContent || '';
        control.trigger.disabled = native.disabled;
    }

    function highlight(index) {
        if (!active || active.kind !== 'select') return;
        active.index = index;
        [...listbox.children].forEach((option, i) => option.classList.toggle('is-active', i === index));
        const option = listbox.children[index];
        if (!option) return;
        active.trigger.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
    }

    function commit(index) {
        if (!active || active.kind !== 'select') return;
        const { native, trigger, options } = active;
        const option = options[index];
        if (!option || option.disabled) return;
        native.value = option.value;
        close();
        trigger.focus({ preventScroll: true });
        native.dispatchEvent(new Event('change', { bubbles: true }));
        refreshSelect(native);
    }

    function openSelect(native) {
        close();
        const { trigger } = selects.get(native);
        const options = [...native.options].filter((option) => !option.hidden);
        listbox.replaceChildren();
        listbox.setAttribute('aria-labelledby', trigger.id);
        active = { kind: 'select', native, trigger, panel: listbox, options, index: Math.max(0, options.findIndex((option) => option.selected)) };
        options.forEach((option, index) => {
            const item = node('div', {
                id: `editor-option-${index}`, class: 'control-option', role: 'option',
                'aria-selected': String(option.selected), 'aria-disabled': String(option.disabled),
                'data-value': option.value,
            });
            item.append(node('span', {}, option.textContent), node('span', { 'aria-hidden': 'true' }, option.selected ? '✓' : ''));
            item.addEventListener('pointerdown', (event) => event.preventDefault());
            item.addEventListener('pointermove', () => { if (!option.disabled) highlight(index); });
            item.addEventListener('click', () => commit(index));
            listbox.append(item);
        });
        trigger.setAttribute('aria-expanded', 'true');
        listbox.hidden = false;
        position();
        highlight(active.index);
    }

    function moveOption(direction, edge) {
        const { options, index } = active;
        let next = edge === 'start' ? 0 : edge === 'end' ? options.length - 1 : index + direction;
        while (next >= 0 && next < options.length) {
            if (!options[next].disabled) return highlight(next);
            next += direction;
        }
    }

    function selectKey(event, native) {
        const isOpen = active?.native === native;
        if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            close(true);
        } else if (event.key === 'Tab' && isOpen) {
            const trigger = active.trigger;
            commit(active.index);
            // The Custom font handler focuses its text field; Tab must leave focus there.
            if (document.activeElement !== trigger) event.preventDefault();
        } else if (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (!isOpen) {
                openSelect(native);
                if (event.key === 'Home') moveOption(1, 'start');
                if (event.key === 'End') moveOption(-1, 'end');
            } else if (event.key === 'Enter' || event.key === ' ') commit(active.index);
            else if (event.key === 'Home') moveOption(1, 'start');
            else if (event.key === 'End') moveOption(-1, 'end');
            else moveOption(event.key === 'ArrowDown' ? 1 : -1);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            if (!isOpen) openSelect(native);
            const now = Date.now();
            typeahead = now - typeaheadTime < 700 ? typeahead + event.key.toLowerCase() : event.key.toLowerCase();
            typeaheadTime = now;
            const search = new Set(typeahead).size === 1 ? typeahead[0] : typeahead;
            const { options, index } = active;
            for (let offset = search.length === 1 ? 1 : 0; offset <= options.length; offset++) {
                const next = (index + offset) % options.length;
                if (!options[next].disabled && options[next].textContent.toLowerCase().startsWith(search)) {
                    highlight(next);
                    break;
                }
            }
        }
    }

    function enhanceSelect(native) {
        if (selects.has(native)) return;
        const labels = [...native.labels];
        const trigger = node('button', {
            type: 'button', id: `${native.id}-trigger`, class: 'control-select', role: 'combobox',
            'aria-expanded': 'false', 'aria-haspopup': 'listbox', 'aria-controls': listbox.id,
        });
        const value = node('span', { id: `${native.id}-value`, class: 'control-select-value' });
        const labelIDs = labels.map((label, index) => {
            if (!label.id) label.id = `${native.id}-label-${index}`;
            label.htmlFor = trigger.id;
            return label.id;
        });
        if (labelIDs.length) trigger.setAttribute('aria-labelledby', [...labelIDs, value.id].join(' '));
        else trigger.setAttribute('aria-label', native.getAttribute('aria-label') || native.name || native.id);
        trigger.append(value, node('span', { class: 'control-select-arrow', 'aria-hidden': 'true' }));
        native.after(trigger);
        selects.set(native, { trigger, value });
        native.hidden = true;
        trigger.addEventListener('click', () => active?.native === native ? close(true) : openSelect(native));
        trigger.addEventListener('keydown', (event) => selectKey(event, native));
        native.addEventListener('change', () => refreshSelect(native));
        refreshSelect(native);
    }

    function hexToHSV(hex, previousHue = 0) {
        const [r, g, b] = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        let hue = previousHue;
        if (delta) {
            const sector = max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
            hue = ((sector * 60) + 360) % 360;
        }
        return { h: hue, s: max ? delta / max * 100 : 0, v: max * 100, hex: hex.toLowerCase() };
    }

    function hsvToHex({ h, s, v }) {
        const saturation = s / 100;
        const value = v / 100;
        const channel = (offset) => {
            const k = (offset + h / 60) % 6;
            return Math.round((value - value * saturation * Math.max(0, Math.min(k, 4 - k, 1))) * 255).toString(16).padStart(2, '0');
        };
        return `#${channel(5)}${channel(3)}${channel(1)}`;
    }

    function clearColourError() {
        picker.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
        picker.error.hidden = true;
        picker.error.textContent = '';
    }

    function colourError(field, text) {
        field.setAttribute('aria-invalid', 'true');
        picker.error.textContent = text;
        picker.error.hidden = false;
        position();
    }

    function paintColour() {
        picker.style.setProperty('--picker-hue', colourState.h);
        picker.cursor.style.left = `${colourState.s}%`;
        picker.cursor.style.top = `${100 - colourState.v}%`;
        picker.hue.value = colourState.h;
        picker.hex.value = colourState.hex.toUpperCase();
        for (const key of ['h', 's', 'v']) picker.fields[key].value = Math.round(colourState[key]);
    }

    function writeColour() {
        if (active?.kind !== 'colour') return;
        clearColourError();
        colourState.hex = hsvToHex(colourState);
        active.native.value = colourState.hex;
        writingColour = true;
        try { active.native.dispatchEvent(new Event('input', { bubbles: true })); }
        finally { writingColour = false; }
        sync();
        paintColour();
    }

    function chooseHex(value) {
        const hex = value.startsWith('#') ? value : `#${value}`;
        if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return false;
        const full = hex.length === 4 ? '#' + [...hex.slice(1)].map((letter) => letter + letter).join('') : hex;
        colourState = hexToHSV(full, colourState.h);
        writeColour();
        return true;
    }

    function makePicker() {
        picker = node('div', {
            id: 'editor-colour-picker', class: 'control-popover colour-picker', role: 'dialog',
            'aria-labelledby': 'editor-colour-heading', tabindex: '-1', hidden: '',
        });
        const header = node('div', { class: 'colour-picker-heading' });
        picker.heading = node('h3', { id: 'editor-colour-heading' });
        const dismiss = node('button', { type: 'button', class: 'colour-picker-close', 'aria-label': 'Close colour picker' }, '×');
        dismiss.addEventListener('click', () => close(true));
        header.append(picker.heading, dismiss);
        const body = node('div', { class: 'colour-picker-body' });
        const plane = node('div', { class: 'colour-plane', 'aria-hidden': 'true' });
        picker.cursor = node('span', { class: 'colour-cursor' });
        plane.append(picker.cursor);
        const point = (event) => {
            const rect = plane.getBoundingClientRect();
            colourState.s = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
            colourState.v = Math.max(0, Math.min(100, 100 - (event.clientY - rect.top) / rect.height * 100));
            writeColour();
        };
        plane.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            plane.setPointerCapture(event.pointerId);
            point(event);
        });
        plane.addEventListener('pointermove', (event) => {
            if (plane.hasPointerCapture(event.pointerId)) point(event);
        });
        plane.addEventListener('pointerup', (event) => {
            if (plane.hasPointerCapture(event.pointerId)) plane.releasePointerCapture(event.pointerId);
        });
        picker.hue = node('input', { type: 'range', id: 'picker-hue', class: 'colour-hue', min: '0', max: '360', step: '1', 'aria-label': 'Hue' });
        picker.hue.addEventListener('input', () => { colourState.h = Number(picker.hue.value); writeColour(); });
        const hexRow = node('div', { class: 'colour-hex-row' });
        picker.hex = node('input', { type: 'text', id: 'picker-hex', maxlength: '7', spellcheck: 'false', autocomplete: 'off', 'aria-describedby': 'picker-error' });
        picker.hex.addEventListener('change', () => {
            if (active?.kind !== 'colour') return;
            if (!chooseHex(picker.hex.value.trim())) colourError(picker.hex, 'Enter a 3 or 6 digit hex colour.');
        });
        hexRow.append(node('label', { for: picker.hex.id }, 'Hex'), picker.hex);
        const fields = node('div', { class: 'colour-components' });
        picker.fields = {};
        for (const [key, label, max] of [['h', 'Hue', 360], ['s', 'Saturation', 100], ['v', 'Brightness', 100]]) {
            const wrapper = node('div');
            const value = node('div', { class: 'colour-component-value' });
            const input = node('input', { type: 'number', id: `picker-${key}`, min: '0', max: String(max), step: '1', 'aria-describedby': 'picker-error' });
            picker.fields[key] = input;
            value.append(input, node('span', { class: 'colour-unit', 'aria-hidden': 'true' }, key === 'h' ? '°' : '%'));
            wrapper.append(node('label', { for: input.id }, label), value);
            fields.append(wrapper);
            input.addEventListener('change', () => {
                if (active?.kind !== 'colour') return;
                const value = input.valueAsNumber;
                if (!Number.isFinite(value) || value < 0 || value > max) return colourError(input, `Enter ${label.toLowerCase()} from 0 to ${max}.`);
                colourState[key] = value;
                writeColour();
            });
        }
        picker.error = node('p', { class: 'colour-picker-error', id: 'picker-error', role: 'status', hidden: '' });
        picker.swatches = node('div', { class: 'colour-picker-swatches', role: 'group', 'aria-label': 'Theme colours' });
        body.append(plane, picker.hue, hexRow, fields, picker.error, picker.swatches);
        picker.append(header, body);
        picker.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.target.matches('input[type=text], input[type=number]')) {
                event.preventDefault();
                event.target.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = [...picker.querySelectorAll('button, input')].filter((item) => !item.disabled);
            const first = focusable[0];
            const last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                close(true);
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                const trigger = active.trigger;
                close();
                const pageFields = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
                    .filter((item) => item.tabIndex >= 0 && !item.disabled && item.getClientRects().length && !picker.contains(item));
                (pageFields[pageFields.indexOf(trigger) + 1] || trigger).focus();
            }
        });
        document.body.append(picker);
    }

    function openColour(native, pointerType) {
        close();
        const trigger = colours.get(native);
        active = { kind: 'colour', native, trigger, panel: picker };
        colourState = hexToHSV(native.value);
        picker.heading.textContent = native.closest('.color-control')?.querySelector('label')?.textContent || 'Colour';
        clearColourError();
        picker.swatches.replaceChildren();
        const unique = [...new Set([...colours.keys()].map((input) => input.value))].slice(0, 8);
        for (const colour of unique) {
            const button = node('button', { type: 'button', class: 'colour-palette-swatch', title: colour.toUpperCase(), 'aria-label': `Use ${colour.toUpperCase()}` });
            button.style.backgroundColor = colour;
            button.addEventListener('click', () => chooseHex(colour));
            picker.swatches.append(button);
        }
        paintColour();
        trigger.setAttribute('aria-expanded', 'true');
        picker.hidden = false;
        position();
        if (pointerType === 'touch') picker.focus({ preventScroll: true });
        else {
            picker.hex.focus({ preventScroll: true });
            picker.hex.select();
        }
    }

    function enhanceColour(native) {
        if (colours.has(native)) return;
        const trigger = node('button', {
            type: 'button', id: `${native.id}-trigger`, class: 'control-colour',
            'aria-label': native.getAttribute('aria-label') || 'Pick colour',
            'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': picker.id,
        });
        trigger.append(node('span', { class: 'control-colour-mark', 'aria-hidden': 'true' }, '+'));
        trigger.style.backgroundColor = native.value;
        native.after(trigger);
        native.hidden = true;
        colours.set(native, trigger);
        let lastPointerType;
        trigger.addEventListener('pointerdown', (event) => { lastPointerType = event.pointerType; });
        trigger.addEventListener('click', (event) => {
            const pointerType = event.detail === 0 ? 'keyboard' : event.pointerType || lastPointerType;
            if (active?.native === native) close(true);
            else openColour(native, pointerType);
            lastPointerType = undefined;
        });
    }

    function sync() {
        for (const native of selects.keys()) refreshSelect(native);
        for (const [native, trigger] of colours) {
            trigger.style.backgroundColor = native.value;
            trigger.title = native.value.toUpperCase();
        }
        if (active?.kind === 'colour' && !writingColour && active.native.value.toLowerCase() !== colourState.hex) {
            colourState = hexToHSV(active.native.value, colourState.h);
            paintColour();
        }
    }

    function enhance(root) {
        if (!listbox) {
            listbox = node('div', { id: 'editor-select-list', class: 'control-popover control-listbox', role: 'listbox', hidden: '' });
            document.body.append(listbox);
            makePicker();
            document.addEventListener('pointerdown', (event) => {
                if (active && !active.panel.contains(event.target) && !active.trigger.contains(event.target)) close();
            });
            document.addEventListener('focusin', (event) => {
                if (active && !active.panel.contains(event.target) && !active.trigger.contains(event.target)) close();
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && active) { event.preventDefault(); close(true); }
            });
            window.addEventListener('resize', position);
            window.visualViewport?.addEventListener('resize', position);
            document.addEventListener('scroll', (event) => {
                if (active && !active.panel.contains(event.target)) close();
            }, true);
        }
        root.querySelectorAll('select').forEach(enhanceSelect);
        root.querySelectorAll('input[type=color]').forEach(enhanceColour);
        sync();
    }

    window.Relay98Controls = { enhance, sync, close };
})();
