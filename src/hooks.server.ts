import { redirect, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { verifySessionCookie, getTokenFromCookie } from '$lib/server/auth/index.js';
import { isSupabaseConfigured, createSupabaseServerClient } from '$lib/server/supabase.server.js';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isBuilderRoute = pathname.startsWith('/builder');
	const isBuilderApi = pathname.startsWith('/api/builder');

	if (isBuilderRoute || isBuilderApi) {
		let authenticated = false;

		// 1. Try Supabase auth first
		if (isSupabaseConfigured()) {
			const supabase = createSupabaseServerClient(event.cookies);
			const {
				data: { user }
			} = await supabase.auth.getUser();

			if (user) {
				event.locals.user = {
					username: user.user_metadata?.full_name || user.email || 'user',
					provider: 'supabase',
					id: user.id,
					email: user.email
				};
				authenticated = true;
			}
		}

		// 2. Try GitHub auth
		if (!authenticated) {
			const githubConfigured =
				env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.AUTH_SECRET;

			if (githubConfigured) {
				const session = verifySessionCookie(event.cookies);
				if (session) {
					event.locals.user = { username: session.username, provider: 'github' };
					event.locals.githubToken = getTokenFromCookie(event.cookies) ?? undefined;
					authenticated = true;
				}
			}
		}

		// 3. Dev mode bypass (no auth configured or no session)
		if (!authenticated && dev) {
			const anyAuthConfigured =
				isSupabaseConfigured() ||
				(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.AUTH_SECRET);

			if (!anyAuthConfigured) {
				event.locals.user = { username: 'dev', provider: 'dev' };
				authenticated = true;
			}
		}

		// 4. Not authenticated — reject
		if (!authenticated) {
			if (isBuilderApi) {
				error(401, 'Unauthorized');
			}
			redirect(302, '/auth/login');
		}
	}

	return resolve(event);
};
