import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Straight to the introduction: /demo -> /docs -> introduction would be two hops.
export const load: PageLoad = () => {
	redirect(308, "/docs/getting-started/introduction");
};
