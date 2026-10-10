/**
 * Server-side gate for the dev-only capture stage. The route server-renders
 * (no `ssr = false`), so this load runs for the HTML request itself: outside
 * dev the answer is a real 404 and the page module, which carries the demo
 * loader, is never sent to the browser.
 */

import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
	// `dev` follows the `development` export condition, which a dev server
	// started with `--mode test` drops; Vite's own flag still says "serve".
	if (!(dev || import.meta.env.DEV)) error(404, "Not found");
	return {};
};
