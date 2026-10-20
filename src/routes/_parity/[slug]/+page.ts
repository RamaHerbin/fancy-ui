/**
 * Dev-only parity stage for `scripts/parity/capture.mjs`: one component's base
 * docs demo (the same one the Preview tab shows), alone in a fixed 800×500
 * box, so it can be photographed next to the React and Vue parity apps
 * (`examples/parity-react`, `examples/parity-vue`). Never prerendered and a 404
 * outside `vite dev`, so it cannot ship.
 */

import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { getComponent } from "$lib/fancy-ui/registry.js";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = ({ params, url }) => {
	// `dev` follows the `development` export condition, which a dev server
	// started with `--mode test` drops; Vite's own flag still says "serve".
	const component = dev || import.meta.env.DEV ? getComponent(params.slug) : undefined;
	if (!component) error(404, "Not found");
	return { slug: component.slug, theme: url.searchParams.get("theme") === "dark" ? "dark" : "light" };
};
