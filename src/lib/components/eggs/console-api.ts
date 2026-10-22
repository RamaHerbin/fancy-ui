/**
 * window.fancy: a tiny console companion for curious developers. Installed
 * once from EggRuntime's onMount, so it never runs during SSR.
 */

import { resetEggs } from "./discovery.svelte.js";
import type { EggRuntime } from "./runtime.svelte.js";

export interface FancyConsoleApi {
	help(): void;
	party(): void;
	matrix(): void;
	eggs(): void;
	reset(): void;
	readonly version: string;
}

declare global {
	interface Window {
		fancy?: FancyConsoleApi;
	}
}

const ACCENT = "color:#e8dcc4;font-weight:600";
const MUTED = "color:#9a9a9a";

export function installFancyConsole(runtime: EggRuntime, opts: { version: string }): void {
	if (typeof window === "undefined" || window.fancy) return;

	console.info(
		`%c✦ FancyUI%c v${opts.version}\n%cCurious? Type fancy.help()`,
		`${ACCENT};font-size:13px`,
		MUTED,
		ACCENT
	);

	const api: FancyConsoleApi = {
		help() {
			console.info(
				[
					"%c✦ fancy commands",
					"  fancy.help()    this list",
					"  fancy.eggs()    what you have found, and hints for the rest",
					"  fancy.party()   throw a little party",
					"  fancy.matrix()  wake up",
					"  fancy.reset()   forget every discovery in this browser",
					"  fancy.version   the package version",
				].join("\n"),
				ACCENT
			);
			void runtime.trigger("console");
		},
		eggs() {
			// Mark first so the table already shows this one as found.
			void runtime.trigger("console");
			const visible = runtime.list().filter((e) => !e.hidden);
			console.table(
				visible.map((e) => ({
					egg: e.title,
					found: e.found ? "✓" : "·",
					hint: e.found ? "" : e.hint,
				}))
			);
			const count = visible.filter((e) => e.found).length;
			console.info(`%c${count}/${visible.length} found`, ACCENT);
		},
		party() {
			void runtime.trigger("cheatcode");
		},
		matrix() {
			void runtime.trigger("matrix");
		},
		reset() {
			resetEggs();
			console.info("%cDiscoveries cleared. Happy hunting.", MUTED);
		},
		version: opts.version,
	};

	window.fancy = api;
}
