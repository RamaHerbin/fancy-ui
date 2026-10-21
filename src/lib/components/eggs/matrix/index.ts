import type { EggDef } from "../types.js";

// The payload (and the rain engine) stays in its own chunk until the word is typed.
export default {
	id: "matrix",
	order: 30,
	title: "Wake up",
	hint: "Type a six-letter word for a grid of numbers. Anywhere, as long as no field has focus.",
	trigger: { kind: "word", word: "matrix" },
	autoDismissMs: 30000,
	load: () => import("./MatrixOverlay.svelte").then((m) => ({ default: m.default })),
} satisfies EggDef;
