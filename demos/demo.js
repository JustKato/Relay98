// Use a regular script so the pages also work over file://.
(() => {
    const root = document.documentElement;
    const theme = new URLSearchParams(window.location.search).get('theme') || '../build/relay98.theme.css';
    const domReady = new Promise((resolve) => {
        if (document.readyState !== 'loading') resolve();
        else document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });

    // Bundle the icons so the demos don't need Discord's CDN.
    domReady.then(() => {
        const icons = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icons.setAttribute('class', 'icon-definitions');
        icons.setAttribute('aria-hidden', 'true');
        icons.innerHTML = `
            <symbol id="i-discord" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M20.3 4.4a20 20 0 0 0-4.9-1.5l-.6 1.2a18 18 0 0 0-5.6 0l-.6-1.2a20 20 0 0 0-4.9 1.5C.6 9 .1 13.5.4 17.9a20 20 0 0 0 6 3l1.2-2-1.8-.9.4-.3c3.8 1.8 7.8 1.8 11.6 0l.4.3-1.8.9 1.2 2a20 20 0 0 0 6-3c.4-5.1-.8-9.6-3.3-13.5ZM8.2 15.3c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5Zm7.6 0c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5Z"/></symbol>
            <symbol id="i-hash" viewBox="0 0 24 24"><path d="M5 9h15M4 15h15M11 3 7 21M18 3l-4 18"/></symbol>
            <symbol id="i-home" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/></symbol>
            <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
            <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></symbol>
            <symbol id="i-voice" viewBox="0 0 24 24"><path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></symbol>
            <symbol id="i-headphones" viewBox="0 0 24 24"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H2v8h5v-8ZM20 12h2v8h-5v-8Z"/></symbol>
            <symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></symbol>
            <symbol id="i-settings" viewBox="0 0 24 24"><path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/></symbol>
            <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></symbol>
            <symbol id="i-bell" viewBox="0 0 24 24"><path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4ZM10 21h4"/></symbol>
            <symbol id="i-pin" viewBox="0 0 24 24"><path d="m14 3 7 7-4 1-3 5-3-3-6 6-1-1 6-6-3-3 5-3Z"/></symbol>
            <symbol id="i-members" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M1 22v-3a8 8 0 0 1 16 0v3M17 3a4 4 0 0 1 0 8M18 14a6 6 0 0 1 5 6v2"/></symbol>
            <symbol id="i-inbox" viewBox="0 0 24 24"><path d="M5 3h14l3 13v5H2v-5ZM2 16h6l2 3h4l2-3h6M8 7h8M8 11h8"/></symbol>
            <symbol id="i-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 3-3 6M12 17v2"/></symbol>
            <symbol id="i-game" viewBox="0 0 24 24"><path d="M6 7h12l4 12h-5l-3-4h-4l-3 4H2ZM7 9v5M4.5 11.5h5M16 10h1M18 13h1"/></symbol>
            <symbol id="i-chat" viewBox="0 0 24 24"><path d="M3 3h18v14H9l-6 4ZM7 8h10M7 12h7"/></symbol>
            <symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></symbol>
            <symbol id="i-smile" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M7 14c2 5 8 5 10 0M8 8v2M16 8v2"/></symbol>
            <symbol id="i-gift" viewBox="0 0 24 24"><path d="M3 7h18v5H3ZM5 12v9h14v-9M12 7v14M12 7C4 7 5 0 9 3ZM12 7c8 0 7-7 3-4Z"/></symbol>
            <symbol id="i-check" viewBox="0 0 24 24"><path d="m4 12 5 5L21 5"/></symbol>
            <symbol id="i-leaf" viewBox="0 0 24 24"><path d="M20 3C8 2 2 8 5 16s16 7 15-13ZM4 21 16 9M9 16v-5M9 16h5"/></symbol>
            <symbol id="i-close" viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19"/></symbol>
            <symbol id="i-min" viewBox="0 0 24 24"><path d="M4 17h16"/></symbol>
            <symbol id="i-max" viewBox="0 0 24 24"><path d="M4 4h16v16H4Z"/></symbol>
            <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 2 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/></symbol>
            <symbol id="i-folder" viewBox="0 0 24 24"><path d="M2 5h8l3 3h9v13H2Z"/></symbol>
            <symbol id="i-shield" viewBox="0 0 24 24"><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/></symbol>
            <symbol id="i-monitor" viewBox="0 0 24 24"><path d="M2 3h20v14H2ZM12 17v5M7 22h10"/></symbol>
            <symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 14A10 10 0 0 1 10 3a10 10 0 1 0 11 11Z"/></symbol>
            <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 0v4M12 20v4M0 12h4M20 12h4M3 3l3 3M18 18l3 3M3 21l3-3M18 6l3-3"/></symbol>
        `;
        document.body.prepend(icons);
        for (const slider of document.querySelectorAll('.demo-range')) {
            slider.addEventListener('input', () => {
                const percent = (Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min)) * 100;
                slider.parentElement.style.setProperty('--demo-range-value', `${percent}%`);
            });
        }
        if (new URLSearchParams(window.location.search).has('theme')) {
            for (const anchor of document.querySelectorAll('a[href$=".html"]')) {
                const destination = new URL(anchor.href);
                destination.searchParams.set('theme', theme);
                anchor.href = destination.href;
            }
        }
    });

    root.dataset.demoStatus = 'loading';
    const link = document.createElement('link');
    link.id = 'demo-theme';
    link.rel = 'stylesheet';
    if (window.location.protocol === 'file:' && theme.startsWith('/')) {
        const fileUrl = new URL('file:///');
        fileUrl.pathname = theme;
        link.href = fileUrl.href;
    } else {
        link.href = theme;
    }

    const themeReady = new Promise((resolve, reject) => {
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', () => reject(new Error(`Could not load theme: ${link.href}`)), { once: true });
    });

    window.demoReady = (async () => {
        await Promise.all([themeReady, domReady]);
        await Promise.all(Array.from(document.images, (image) => new Promise((resolve, reject) => {
            const loaded = () => image.naturalWidth > 0 ? resolve() : reject(new Error(`Could not load image: ${image.src}`));
            if (image.complete) loaded();
            else {
                image.addEventListener('load', loaded, { once: true });
                image.addEventListener('error', () => reject(new Error(`Could not load image: ${image.src}`)), { once: true });
            }
        })));
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        root.dataset.demoStatus = 'ready';
        root.dataset.demoReady = 'true';
    })();

    // Show load errors on the page. Screenshot scripts can still catch demoReady.
    window.demoReady.catch(async (error) => {
        root.dataset.demoStatus = 'error';
        root.dataset.demoError = error.message;
        await domReady;
        const notice = document.createElement('aside');
        notice.className = 'demo-error';
        notice.setAttribute('role', 'alert');
        notice.textContent = `${error.message}. Run npm run build and check the demo assets, or supply a CSS URL with ?theme=...`;
        document.body.append(notice);
        console.error(error);
    });

    document.head.append(link);
})();
