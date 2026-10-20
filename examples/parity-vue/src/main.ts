/**
 * Vue parity stage: ?slug=<slug>&theme=light|dark renders
 * src/scenarios/<slug>.vue alone in the same 800×500 box as the Svelte stage
 * (src/routes/_parity/[slug]/+page.svelte), so scripts/parity/capture.mjs can
 * photograph the three frameworks side by side.
 */

import "./parity.css";
import { createApp, markRaw, type Component } from "vue";
import Stage from "./Stage.vue";

const scenarios = import.meta.glob<{ default: Component }>("./scenarios/*.vue");

const params = new URLSearchParams(location.search);
const slug = params.get("slug") ?? "";
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");

async function mount() {
	const load = scenarios[`./scenarios/${slug}.vue`];
	const scenario = load ? markRaw((await load()).default) : null;
	createApp(Stage, { scenario, slug }).mount("#app");
	await document.fonts.ready;
	// No rAF wait: capture.mjs freezes the clock (rAF included) until this flag
	// is up, as the Svelte stage's t = 0 is also taken before any frame.
	document.documentElement.dataset.parityReady = "1";
}

mount();
