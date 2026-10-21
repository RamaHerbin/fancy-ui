// One screen's request, folded into the four states it can be in.
// `reload` keeps the previous state on screen (an error stays an error, busy)
// while the next attempt runs; only a stale answer is dropped.
import { settle, type LoadState } from "$lib/data/api.js";

export interface Loader<T> {
	readonly state: LoadState<T>;
	/** True while a reload runs on top of an existing state. */
	readonly reloading: boolean;
	reload(): Promise<void>;
	/** Replaces the data with a newer copy (after a save), as ready. */
	set(data: T): void;
}

export function createLoader<T>(
	request: () => Promise<T>,
	isEmpty: (data: T) => boolean = () => false
): Loader<T> {
	// Raw: the data is replaced wholesale, never mutated in place, and screens
	// compare it by identity to know when a new answer arrived.
	let state = $state.raw<LoadState<T>>({ status: "loading" });
	let reloading = $state(false);
	let attempt = 0;

	async function reload() {
		const mine = ++attempt;
		reloading = true;
		const next = await settle(request, isEmpty);
		if (mine !== attempt) return;
		state = next;
		reloading = false;
	}

	void reload();

	return {
		get state() {
			return state;
		},
		get reloading() {
			return reloading;
		},
		reload,
		set(data) {
			attempt += 1;
			reloading = false;
			state = { status: "ready", data };
		},
	};
}
