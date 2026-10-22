import type { EggDef } from "../types.js";

// Reached from the retro desktop's Start menu (About marks it found, Shut down
// fires it). The curtain payload mounts in the root overlay host, never in the
// taskbar: switching the skin unmounts the taskbar mid-transition.
export default {
	id: "retro",
	order: 60,
	title: "Shut down",
	hint: "Some operating systems hide the exit under Start.",
	trigger: { kind: "manual" },
	load: () => import("./ShutdownOverlay.svelte").then((m) => ({ default: m.default })),
	// Reduced motion: the same exit, without the curtain. A custom fallback
	// replaces the runtime's quiet note, so the skin change is the feedback.
	fallback: () => {
		void import("$lib/stores").then(({ setSkin }) => setSkin("standard"));
	},
} satisfies EggDef;
