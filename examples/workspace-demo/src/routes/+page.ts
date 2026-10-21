import { redirect } from "@sveltejs/kit";

// The workspace opens on the profile. Prerendered as a redirect page, so the
// static build needs no server rule for it.
export function load() {
	redirect(307, "/profile");
}
