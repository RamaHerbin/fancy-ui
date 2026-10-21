/**
 * Which eggs this browser has found, kept in localStorage as `{ v: 1, found }`.
 * Same shape discipline as the saved-references store: every storage access
 * is browser-only and try/caught, and the first read (not the module import)
 * attaches the cross-tab `storage` listener, so SSR never touches `window`.
 */

import { browser } from "$app/environment";
import { untrack } from "svelte";
import { EGG_IDS, type EggId } from "./types.js";

export const EGGS_STORAGE_KEY = "fancy-ui-eggs";
const VERSION = 1;

let found = $state<string[]>([]);
let hydrated = false;

/** Pure parser. Invalid JSON, another version or unknown ids all degrade to fewer ids. */
export function parseEggsPayload(raw: string | null, valid: readonly string[]): string[] {
	if (raw == null) return [];
	try {
		const data: unknown = JSON.parse(raw);
		if (!data || typeof data !== "object" || (data as { v?: unknown }).v !== VERSION) return [];
		const list = (data as { found?: unknown }).found;
		if (!Array.isArray(list)) return [];
		return [
			...new Set(list.filter((id): id is string => typeof id === "string" && valid.includes(id))),
		];
	} catch {
		return [];
	}
}

function persist(): void {
	if (!browser) return;
	try {
		localStorage.setItem(EGGS_STORAGE_KEY, JSON.stringify({ v: VERSION, found }));
	} catch {
		// Storage blocked: discoveries still count for this session.
	}
}

/** Cross-tab sync. Never writes back, that would loop the tab that wrote it. */
function handleStorage(event: StorageEvent): void {
	if (event.key !== EGGS_STORAGE_KEY && event.key !== null) return;
	const next = parseEggsPayload(event.key === null ? null : event.newValue, EGG_IDS);
	untrack(() => {
		found = next;
	});
}

function ensure(): void {
	if (hydrated || !browser) return;
	hydrated = true;
	// The first read can happen inside a $derived: the write must be untracked.
	untrack(() => {
		try {
			found = parseEggsPayload(localStorage.getItem(EGGS_STORAGE_KEY), EGG_IDS);
		} catch {
			found = [];
		}
		window.addEventListener("storage", handleStorage);
	});
}

export function markFound(id: EggId): void {
	ensure();
	if (found.includes(id)) return;
	found = [...found, id];
	persist();
}

export function isFound(id: EggId): boolean {
	ensure();
	return found.includes(id);
}

export function resetEggs(): void {
	ensure();
	found = [];
	persist();
}

export function getFound(): ReadonlySet<string> {
	ensure();
	return new Set(found);
}

/**
 * Reactive accessor. `count` only counts ids listed in `countable` when given
 * (pass the non-hidden ids so a hidden egg never shows 9/8).
 */
export function createEggsState(total: number, countable?: readonly string[]) {
	ensure();
	const counted = $derived(countable ? found.filter((id) => countable.includes(id)) : found);
	return {
		get found(): ReadonlySet<string> {
			return new Set(found);
		},
		get count(): number {
			return counted.length;
		},
		get total(): number {
			return total;
		},
	};
}
