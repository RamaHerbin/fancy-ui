/**
 * Framework preference — which of React / Svelte / Vue the visitor wants to
 * see install lines, imports and docs for. Same shape as the skin store: a
 * module-level `$state` hydrated once in the browser, a setter that writes
 * back, and a reactive accessor for components. Default is Svelte, the
 * package the docs are written against.
 *
 * The choice is shareable: `?framework=react|vue|svelte` in the address wins
 * over the saved preference (and becomes it), and every switch rewrites that
 * parameter in place, so the link in the address bar always opens the page the
 * way it is shown. Components still read the store after mount
 * (`mounted ? store.framework : "svelte"`), so prerendered markup and the first
 * client render agree.
 */

import { browser } from "$app/environment";
import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import { FRAMEWORKS, type Framework } from "$lib/inspiration/types.js";

export type { Framework };

const STORAGE_KEY = "fancy-ui-framework";
/** Query parameter that carries the choice in a shared link. */
export const FRAMEWORK_PARAM = "framework";

export function isFramework(value: unknown): value is Framework {
	return typeof value === "string" && (FRAMEWORKS as readonly string[]).includes(value);
}

/** The framework named by a URL's query, or null when absent or unknown. */
export function frameworkFromUrl(url: URL): Framework | null {
	const value = url.searchParams.get(FRAMEWORK_PARAM);
	return isFramework(value) ? value : null;
}

let framework = $state<Framework>("svelte");

function persist(next: Framework): void {
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// Storage full or blocked — the in-memory state still works for the session.
	}
}

/** Rewrite `?framework=` in the current entry: no navigation, no new history entry. */
function writeUrl(next: Framework): void {
	const url = new URL(window.location.href);
	if (url.searchParams.get(FRAMEWORK_PARAM) === next) return;
	url.searchParams.set(FRAMEWORK_PARAM, next);
	try {
		// The router's own entry point keeps its bookkeeping in step with the address.
		replaceState(url, page.state);
	} catch {
		// Before the router has started (or outside it): the plain history call,
		// keeping whatever state the entry already carries.
		history.replaceState(history.state, "", url);
	}
}

if (browser) {
	const fromUrl = frameworkFromUrl(new URL(window.location.href));
	if (fromUrl) {
		framework = fromUrl;
		persist(fromUrl);
	} else {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (isFramework(saved)) framework = saved;
		} catch {
			// Storage blocked: the in-memory default still works for the session.
		}
	}
	window.addEventListener("storage", (event) => {
		if (event.key === STORAGE_KEY && isFramework(event.newValue)) framework = event.newValue;
	});
}

export function getFramework(): Framework {
	return framework;
}

export function setFramework(next: Framework): void {
	framework = next;
	if (!browser) return;
	persist(next);
	writeUrl(next);
}

/**
 * Adopt the framework a URL names, for links followed inside the app after the
 * store has loaded. A URL without the parameter leaves the choice alone, and
 * the address is not rewritten.
 */
export function followUrl(url: URL): void {
	const fromUrl = frameworkFromUrl(url);
	if (!fromUrl || fromUrl === framework) return;
	framework = fromUrl;
	if (browser) persist(fromUrl);
}

/** Reactive accessor for components. */
export function createFrameworkState() {
	return {
		get framework(): Framework {
			return framework;
		},
		set: setFramework,
	};
}
