/**
 * Locale Store
 *
 * Manages the active docs locale, persists it, and reflects it on <html>
 * (`lang` + `dir`). Provides a reactive `t()` translator that falls back to
 * English for any missing key. Mirrors the shape of the theme store.
 */

import { browser } from "$app/environment";
import { locales, defaultLocale, getLocaleDef, type Dir } from "$lib/i18n/locales.js";
import { en, type MessageKey } from "$lib/i18n/messages/en.js";
import { catalogs } from "$lib/i18n/messages/index.js";

const STORAGE_KEY = "fancy-ui-locale";

let current = $state<string>(defaultLocale);

function resolveInitial(): string {
	if (!browser) return defaultLocale;
	// Precedence: ?lang= URL param → localStorage → navigator → default.
	const fromUrl = new URLSearchParams(window.location.search).get("lang");
	if (fromUrl && getLocaleDef(fromUrl)) return fromUrl;
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved && getLocaleDef(saved)) return saved;
	const nav = (navigator.language ?? "").toLowerCase();
	const exact = locales.find((l) => l.code.toLowerCase() === nav);
	if (exact) return exact.code;
	const base = nav.split("-")[0];
	const partial = locales.find((l) => l.code.toLowerCase().split("-")[0] === base);
	return partial?.code ?? defaultLocale;
}

function applyLocale() {
	if (!browser) return;
	const def = getLocaleDef(current) ?? getLocaleDef(defaultLocale)!;
	document.documentElement.lang = def.code;
	document.documentElement.dir = def.dir;
}

/** Reflect the locale in the URL as ?lang=<code>, without a route change. */
function syncUrl(code: string) {
	if (!browser) return;
	const url = new URL(window.location.href);
	if (url.searchParams.get("lang") !== code) {
		url.searchParams.set("lang", code);
		history.replaceState(history.state, "", url);
	}
}

function handlePopState() {
	const fromUrl = new URLSearchParams(window.location.search).get("lang");
	if (fromUrl && getLocaleDef(fromUrl) && fromUrl !== current) {
		current = fromUrl;
		localStorage.setItem(STORAGE_KEY, fromUrl);
		applyLocale();
	}
}

function initialize() {
	if (!browser) return;
	const urlLang = new URLSearchParams(window.location.search).get("lang");
	current = resolveInitial();
	applyLocale();
	// A deep-linked ?lang= wins and is remembered for next visit.
	if (urlLang && getLocaleDef(urlLang)) localStorage.setItem(STORAGE_KEY, current);
	window.addEventListener("popstate", handlePopState);
}

// =============================================================================
// Public API
// =============================================================================

export function setLocale(code: string) {
	if (!getLocaleDef(code)) return;
	current = code;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, code);
		applyLocale();
		syncUrl(code);
	}
}

export function getLocale(): string {
	return current;
}

export function getDir(): Dir {
	return getLocaleDef(current)?.dir ?? "ltr";
}

/**
 * Translate a key for the active locale, falling back to English.
 * Reads the reactive `current`, so template usages re-render on locale change.
 */
export function t(key: MessageKey): string {
	const code = current;
	return catalogs[code]?.[key] ?? en[key];
}

/** Reactive accessor for components (locale + dir + translator + list). */
export function createI18n() {
	return {
		get locale() {
			return current;
		},
		get dir(): Dir {
			return getLocaleDef(current)?.dir ?? "ltr";
		},
		get locales() {
			return locales;
		},
		t,
		setLocale,
	};
}

// Initialize when the module loads (client-side).
if (browser) {
	initialize();
}
