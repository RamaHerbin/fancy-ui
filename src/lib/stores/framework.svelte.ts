/**
 * Framework preference — which of React / Svelte / Vue the visitor wants to
 * see install lines, imports and docs for. Same shape as the skin store: a
 * module-level `$state` hydrated once in the browser, a setter that writes
 * back, and a reactive accessor for components. Default is Svelte, the
 * package the docs are written against.
 */

import { browser } from "$app/environment";
import { FRAMEWORKS, type Framework } from "$lib/inspiration/types.js";

export type { Framework };

const STORAGE_KEY = "fancy-ui-framework";

function isFramework(value: unknown): value is Framework {
	return typeof value === "string" && (FRAMEWORKS as readonly string[]).includes(value);
}

let framework = $state<Framework>("svelte");

if (browser) {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (isFramework(saved)) framework = saved;
	} catch {
		// Storage blocked: the in-memory default still works for the session.
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
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// Storage full or blocked — the in-memory state still works for the session.
	}
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
