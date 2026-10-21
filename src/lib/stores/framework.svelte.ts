/**
 * Framework preference — which of React / Svelte / Vue the visitor wants to
 * see install lines, imports and docs for. Same shape as the skin store: a
 * module-level `$state` hydrated once in the browser, a setter that writes
 * back, and a reactive accessor for components. Default is Svelte, the
 * package the docs are written against.
 *
 * The choice is shareable: `?framework=react|vue|svelte` in the address wins
 * over the saved preference (and becomes it). Once a choice exists (from the
 * address, the saved preference or a switch), every switch and every docs
 * navigation write that parameter in place, so the link in the address bar
 * opens the page the way it is shown. A visitor who never chose keeps clean
 * addresses. Only docs addresses (`/docs…`) are read and written: other
 * pages, such as the inspiration gallery, use `?framework=` as a filter of
 * their own. Components still read the store after mount
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

/** Whether a path belongs to the docs, the only pages whose `?framework=` is this choice. */
export function isDocsPath(pathname: string): boolean {
	return pathname === "/docs" || pathname.startsWith("/docs/");
}

/** The framework named by a docs URL's query, or null when absent, unknown or not a docs page. */
export function frameworkFromUrl(url: URL): Framework | null {
	if (!isDocsPath(url.pathname)) return null;
	const value = url.searchParams.get(FRAMEWORK_PARAM);
	return isFramework(value) ? value : null;
}

let framework = $state<Framework>("svelte");
/** Whether the visitor has a choice to carry in docs addresses. */
let chosen = false;

function persist(next: Framework): void {
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// Storage full or blocked — the in-memory state still works for the session.
	}
}

/**
 * Rewrite `?framework=` in the current docs entry: no navigation, no new
 * history entry. Elsewhere the address is left alone.
 */
function writeUrl(next: Framework): void {
	const url = new URL(window.location.href);
	if (!isDocsPath(url.pathname)) return;
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
		chosen = true;
		persist(fromUrl);
	} else {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (isFramework(saved)) {
				framework = saved;
				chosen = true;
			}
		} catch {
			// Storage blocked: the in-memory default still works for the session.
		}
	}
	window.addEventListener("storage", (event) => {
		if (event.key === STORAGE_KEY && isFramework(event.newValue)) {
			framework = event.newValue;
			chosen = true;
		}
	});
}

export function getFramework(): Framework {
	return framework;
}

export function setFramework(next: Framework): void {
	framework = next;
	chosen = true;
	if (!browser) return;
	persist(next);
	writeUrl(next);
}

/**
 * After a navigation inside the app: adopt the framework the new URL names, or,
 * when it names none, write the current choice into the docs address so it
 * survives in-app links. Outside the docs nothing is read or written.
 */
export function followUrl(url: URL): void {
	if (!isDocsPath(url.pathname)) return;
	const fromUrl = frameworkFromUrl(url);
	if (fromUrl) {
		chosen = true;
		if (fromUrl === framework) return;
		framework = fromUrl;
		if (browser) persist(fromUrl);
		return;
	}
	if (browser && chosen) writeUrl(framework);
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
