import { error } from "@sveltejs/kit";

// No docs route matches these URLs, so SvelteKit would hand them to the root
// error page. Matching them here keeps the 404 inside the docs layout (sidebar
// and search) via docs/+error.svelte. Never prerendered: no entries, no crawl.
export function load() {
	error(404, "Not found");
}
