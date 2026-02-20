import { redirect } from '@sveltejs/kit';
import { generateState } from 'arctic';
import { getGitHub } from '$lib/server/auth/index.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const github = getGitHub();
	const state = generateState();

	const authorizationUrl = github.createAuthorizationURL(state, ['read:user']);

	cookies.set('github_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes
	});

	redirect(302, authorizationUrl.toString());
};
