/**
 * Theme constants shared by the inline anti-FOUC script (rendered by the root
 * layout, a Server Component) and the client-side theme hook. No directive on
 * purpose: a "use client" module would hand the layout client references
 * instead of these strings.
 */
export const STORAGE_KEY = "fancy-ui-theme";

/** `#ffffff` is oklch(1 0 0) = --background in :root; `#0a0a0a` is oklch(0.145 0 0) = --background in .dark. */
export const LIGHT_HEX = "#ffffff";
export const DARK_HEX = "#0a0a0a";

/**
 * Runs before first paint, inline in <head>. Mirrors the client hook exactly:
 * same storage key, same allow-list, same "system" resolution. The site is a
 * static export, so there is no request to read a preference from — this is
 * the only place the class can be set before hydration.
 */
export const THEME_IIFE = `(function () {
	var root = document.documentElement;
	var stored = null;
	try { stored = localStorage.getItem('${STORAGE_KEY}'); } catch (e) {}
	var theme = stored === 'light' || stored === 'dark' ? stored : 'system';
	var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
	root.classList.toggle('dark', dark);
	var meta = document.querySelector('meta[name="theme-color"]');
	if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'theme-color'); document.head.appendChild(meta); }
	meta.setAttribute('content', dark ? '${DARK_HEX}' : '${LIGHT_HEX}');
})();`;
