/**
 * Decorative-motion preference — the accessible switch that stops the site's
 * continuous ornaments (halos, iridescence, ambient demos) without touching
 * `prefers-reduced-motion`, which stays the OS's call and is honoured on top.
 *
 * How it applies: `data-motion="paused"` on <html> (pre-painted by the inline
 * script in src/app.html) is read by site-owned CSS through scoped selectors
 * (`html[data-motion="paused"] [data-decorative] { animation-play-state:
 * paused }`) and by components through `createMotionState().paused`, which
 * drives mount decisions and `active`-style props. There is deliberately no
 * global `animation-play-state` rule: it would freeze entrance keyframes at
 * their first (invisible) frame and reach neither rAF nor WAAPI animations.
 */

import { browser } from "$app/environment";

const STORAGE_KEY = "fancy-ui-motion";

export type Motion = "auto" | "paused";

function isMotion(value: unknown): value is Motion {
	return value === "auto" || value === "paused";
}

let motion = $state<Motion>("auto");
let reducedMotion = $state(false);

function apply(): void {
	if (!browser) return;
	const root = document.documentElement;
	if (motion === "paused") root.dataset.motion = "paused";
	else delete root.dataset.motion;
}

if (browser) {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (isMotion(saved)) motion = saved;
	} catch {
		// Storage blocked: the in-memory default still works for the session.
	}
	const query = window.matchMedia("(prefers-reduced-motion: reduce)");
	reducedMotion = query.matches;
	query.addEventListener("change", (event) => {
		reducedMotion = event.matches;
	});
	window.addEventListener("storage", (event) => {
		if (event.key === STORAGE_KEY && isMotion(event.newValue)) {
			motion = event.newValue;
			apply();
		}
	});
	apply();
}

export function getMotion(): Motion {
	return motion;
}

export function setMotion(next: Motion): void {
	motion = next;
	apply();
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// Storage full or blocked — the in-memory state still works for the session.
	}
}

export function toggleMotion(): void {
	setMotion(motion === "paused" ? "auto" : "paused");
}

/**
 * Reactive accessor. `paused` is the one components should read: true when
 * the visitor paused decorative motion OR the OS asks for reduced motion.
 */
export function createMotionState() {
	return {
		get motion(): Motion {
			return motion;
		},
		get userPaused(): boolean {
			return motion === "paused";
		},
		get reducedMotion(): boolean {
			return reducedMotion;
		},
		get paused(): boolean {
			return motion === "paused" || reducedMotion;
		},
		set: setMotion,
		toggle: toggleMotion,
	};
}
