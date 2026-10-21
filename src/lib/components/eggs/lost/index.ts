import type { EggDef } from "../types.js";

// The 404 page mounts LostInSpace itself, so there is no load(): taking the
// teleport link is what counts as finding it.
export default {
	id: "lost",
	order: 50,
	title: "Lost in space",
	hint: "Get lost on purpose. Then let the site pick where you land.",
	trigger: { kind: "manual" },
	foundOn: "payload",
} satisfies EggDef;
