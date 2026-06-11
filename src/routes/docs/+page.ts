import { redirect } from "@sveltejs/kit";

export function load() {
	redirect(302, "/docs/getting-started/introduction");
}
