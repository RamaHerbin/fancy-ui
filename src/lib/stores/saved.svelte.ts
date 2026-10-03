/**
 * Saved references — the ids the visitor bookmarked on /inspiration, kept in
 * this browser's localStorage. No account: the UI says so.
 *
 * Storage shape is versioned (`{ v: 1, ids }`) so a future change can migrate
 * instead of guessing. The first read also copies the pre-Inspiration
 * `fancy-ui-finds-saved` array (same ids) into the new key.
 *
 * Unknown ids are never deleted, only hidden at read time (through
 * `createSavedState(known)`): a tab running an older build cannot know the
 * entries a newer tab bookmarked, and a draft that gets republished comes
 * back on its own. Storage only shrinks on an explicit remove or clear.
 */

import { browser } from "$app/environment";
import { untrack } from "svelte";

export const SAVED_STORAGE_KEY = "fancy-ui-inspiration-saved";
export const LEGACY_SAVED_KEY = "fancy-ui-finds-saved";
const VERSION = 1;

export type StorageStatus = "unknown" | "ok" | "unavailable";

let saved = $state<string[]>([]);
let status = $state<StorageStatus>("unknown");
let hydrated = false;

/** Pure parser for the stored JSON (current or legacy shape). Never throws. */
export function parseSavedPayload(raw: string | null): string[] {
	if (raw == null) return [];
	try {
		const data: unknown = JSON.parse(raw);
		const list = Array.isArray(data)
			? data // legacy: a bare array of ids
			: data && typeof data === "object" && (data as { v?: unknown }).v === VERSION
				? (data as { ids?: unknown }).ids
				: null;
		if (!Array.isArray(list)) return [];
		return [...new Set(list.filter((id): id is string => typeof id === "string" && id !== ""))];
	} catch {
		return [];
	}
}

function serialize(ids: string[]): string {
	return JSON.stringify({ v: VERSION, ids });
}

/** Writes the current list; every failure is swallowed into `status`. */
function persist(): void {
	if (!browser) return;
	try {
		localStorage.setItem(SAVED_STORAGE_KEY, serialize(saved));
		status = "ok";
	} catch {
		status = "unavailable";
	}
}

/** Cross-tab sync. Never writes back — that would loop the tab that wrote it. */
function handleStorage(event: StorageEvent): void {
	if (event.key !== SAVED_STORAGE_KEY && event.key !== null) return;
	const next = event.key === null ? [] : parseSavedPayload(event.newValue);
	untrack(() => {
		saved = next;
	});
}

/** Reads storage once, migrating the legacy key, and attaches the cross-tab listener once. */
function ensure(): void {
	if (hydrated || !browser) return;
	hydrated = true;
	// The first access can happen inside a `$derived`; Svelte rejects a $state
	// write made while a derived is the active reaction unless it is untracked.
	untrack(() => {
		try {
			const current = localStorage.getItem(SAVED_STORAGE_KEY);
			if (current != null) {
				saved = parseSavedPayload(current);
			} else {
				const legacy = localStorage.getItem(LEGACY_SAVED_KEY);
				saved = parseSavedPayload(legacy);
				// The legacy key is copied, not removed: a rollback to the previous
				// build keeps its bookmarks. It can be dropped a release later.
				if (legacy != null) localStorage.setItem(SAVED_STORAGE_KEY, serialize(saved));
			}
			status = "ok";
		} catch {
			status = "unavailable";
		}
		window.addEventListener("storage", handleStorage);
	});
}

export function isSaved(id: string): boolean {
	ensure();
	return saved.includes(id);
}

/** Adds or removes an id. Other ids are left untouched, known to this build or not. */
export function toggleSaved(id: string): void {
	ensure();
	saved = saved.includes(id) ? saved.filter((entry) => entry !== id) : [...saved, id];
	persist();
}

export function clearSaved(): void {
	ensure();
	saved = [];
	persist();
}

/** Reactive accessor for components. With `known`, unknown ids are hidden (not deleted). */
export function createSavedState(known?: ReadonlySet<string>) {
	ensure();
	const visible = $derived(known ? saved.filter((id) => known.has(id)) : saved);
	return {
		get ids(): ReadonlySet<string> {
			return new Set(visible);
		},
		get list(): readonly string[] {
			return visible;
		},
		get count() {
			return visible.length;
		},
		get status(): StorageStatus {
			return status;
		},
		isSaved,
		toggleSaved,
		clearSaved,
	};
}
