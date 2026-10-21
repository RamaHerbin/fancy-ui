import type { EggDef } from "../types.js";

// Found from window.fancy.help() / eggs(); the console itself is the payload,
// so it is never diverted to the reduced-motion note.
export default {
	id: "console",
	order: 20,
	title: "Console whisperer",
	hint: "Developers talk to their tools. Try talking back.",
	trigger: { kind: "manual" },
	motionSensitive: false,
} satisfies EggDef;
