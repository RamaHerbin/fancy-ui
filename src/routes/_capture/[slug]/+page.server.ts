/**
 * Server-side gate for the dev-only capture stage. The universal load in
 * +page.ts never runs on the server (`ssr = false`), so without this file a
 * production build would answer 200 and ship the page to the browser before
 * the client-side `dev` check could 404 it.
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
