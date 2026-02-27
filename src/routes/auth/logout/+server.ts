import { redirect } from "@sveltejs/kit";
import { clearSessionCookie, clearTokenCookie } from "$lib/server/auth/index.js";
import type { RequestHandler } from "./$types.js";

export const POST: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies);
	clearTokenCookie(cookies);
	redirect(302, "/");
};
