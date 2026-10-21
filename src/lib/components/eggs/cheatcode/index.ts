import type { EggDef } from "../types.js";

// The classic arrow-key cheat code. The payload (and canvas-confetti with it)
// only loads once the sequence is typed.
export default {
	id: "cheatcode",
	order: 10,
	title: "Party mode",
	hint: "An old-school sequence: up, up, down, down, left, right, left, right, then two letters.",
	trigger: {
		kind: "sequence",
		keys: [
			"arrowup",
			"arrowup",
			"arrowdown",
			"arrowdown",
			"arrowleft",
			"arrowright",
			"arrowleft",
			"arrowright",
			"b",
			"a",
		],
	},
	toggle: true,
	autoDismissMs: 8000,
	load: () => import("./PartyOverlay.svelte").then((m) => ({ default: m.default })),
} satisfies EggDef;
