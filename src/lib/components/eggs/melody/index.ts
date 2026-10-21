import type { EggDef } from "../types.js";

// Hovering (not clicking) the sound switch, so the preference is never toggled.
// Sound is not motion: never diverted to the reduced-motion note.
export default {
	id: "melody",
	order: 80,
	title: "Hummingbird",
	hint: "The sound switch is ticklish. Brush it seven times, quickly, with sound on.",
	trigger: {
		kind: "dom",
		event: "pointerenter",
		selector: "[data-sound-toggle]",
		count: 7,
		windowMs: 2500,
	},
	motionSensitive: false,
	// Found only once a note actually plays (sound on), never silently.
	foundOn: "payload",
	load: () => import("./play.js").then((m) => ({ run: m.run })),
} satisfies EggDef;
