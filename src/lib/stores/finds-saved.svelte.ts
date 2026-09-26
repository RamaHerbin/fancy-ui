/**
 * Finds bookmarks — the ids the visitor saved on /finds, kept in
 * localStorage. Same shape as the skin store: a module-level `$state`
 * hydrated once in the browser, setters that write back, and a reactive
 * accessor object for components.
 */

import { browser } from "$app/environment";

const STORAGE_KEY = "fancy-ui-finds-saved";

let saved = $state<string[]>([]);

function readStorage(): string[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
	} catch {
		return [];
	}
}

function writeStorage(ids: string[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
	} catch {
		// Storage full or blocked — the in-memory state still works for the session.
	}
}

if (browser) {
	saved = readStorage();
	// Another tab saved something: mirror it here.
	window.addEventListener("storage", (event) => {
		if (event.key === STORAGE_KEY) saved = readStorage();
	});
}

export function isSaved(id: string): boolean {
	return saved.includes(id);
}

export function toggleSaved(id: string) {
	saved = isSaved(id) ? saved.filter((entry) => entry !== id) : [...saved, id];
	if (browser) writeStorage(saved);
}

export function clearSaved() {
	saved = [];
	if (browser) writeStorage(saved);
}

/** Reactive accessor for components. */
export function createSavedState() {
	return {
		get ids(): ReadonlySet<string> {
			return new Set(saved);
		},
		get count() {
			return saved.length;
		},
		isSaved,
		toggleSaved,
		clearSaved,
	};
}
