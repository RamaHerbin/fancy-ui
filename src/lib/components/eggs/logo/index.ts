import type { EggDef } from "../types.js";

// Seven quick clicks on any brand link carrying data-egg="logo". Each click also
// navigates to "/", but the runtime's hit counts live in the root layout and survive.
export default {
	id: "logo",
	order: 40,
	title: "Spark plug",
	hint: "The little spark in the corner likes attention. Seven quick taps.",
	trigger: { kind: "dom", event: "click", selector: "[data-egg='logo']", count: 7, windowMs: 3000 },
	autoDismissMs: 2200,
	load: () => import("./LogoBurst.svelte").then((m) => ({ default: m.default })),
} satisfies EggDef;
