/**
 * Dev-only poster stage for `scripts/build-inspiration-media.mjs`: one FancyUI
 * entry's live demo, alone in a card-sized 16:10 box (400×250 CSS px, shot at
 * 1.8x → 720×450). Never prerendered and a 404 outside `vite dev`, so it
 * cannot ship.
 */

import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { getEntry, isFancyUI } from "$lib/inspiration/catalog.js";
import type { PageLoad } from "./$types";

export const prerender = false;
export const ssr = false;

export const load: PageLoad = ({ params }) => {
	// `dev` follows the `development` export condition, which a dev server
	// started with `--mode test` drops; Vite's own flag still says "serve".
	const entry = dev || import.meta.env.DEV ? getEntry(params.slug) : undefined;
	if (!entry || !isFancyUI(entry)) error(404, "Not found");
	return { entry };
};
