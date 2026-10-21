import type { EggDef } from "../types.js";

// Lives in static/humans.txt. A static file cannot record a visit, so the egg is
// hidden: it never counts toward N/total, it only points at the others.
export default {
	id: "humans",
	order: 70,
	title: "Humans",
	hidden: true,
	hint: "Robots have their file. So do we.",
	trigger: { kind: "manual" },
} satisfies EggDef;
