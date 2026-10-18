import { redirect } from "@sveltejs/kit";

// The gallery moved to /inspiration; old links and bookmarks follow it.
export const prerender = true;

export const load = () => {
	redirect(301, "/inspiration");
};
