import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { verifySessionCookie, getTokenFromCookie } from "$lib/server/auth/index.js";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isBuilderRoute = pathname.startsWith("/builder");
	const isBuilderApi = pathname.startsWith("/api/builder");

	if (isBuilderRoute || isBuilderApi) {
		// Skip auth in dev when GitHub OAuth is not configured
		const authConfigured = env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.AUTH_SECRET;

		if (!authConfigured && dev) {
			event.locals.user = { username: "dev" };
			// In dev without OAuth, githubToken stays undefined → factory falls back to FilesystemStorage
		} else if (!authConfigured && !dev) {
			// Production without OAuth configured — block access
			if (isBuilderApi) {
				error(403, "Builder is not configured — set GitHub OAuth env vars");
			}
			error(403, "Builder is not configured — set GitHub OAuth env vars");
		} else {
			const session = verifySessionCookie(event.cookies);

			if (!session) {
				error(401, "Sign-in required");
			}

			event.locals.user = session;
			event.locals.githubToken = getTokenFromCookie(event.cookies) ?? undefined;
		}
	}

	const response = await resolve(event);

	// /skins renders client-side only (ssr = false), so the served HTML carries
	// no robots meta; the header is the only signal crawlers see before hydration.
	if (pathname === "/skins" || pathname.startsWith("/skins/")) {
		response.headers.set("X-Robots-Tag", "noindex, nofollow");
	}

	return response;
};
