import { error, redirect } from '@sveltejs/kit';
import {
	getGitHub,
	getAllowedUsers,
	createSessionCookie,
	createTokenCookie
} from '$lib/server/auth/index.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('github_oauth_state');

	if (!code || !state || !storedState || state !== storedState) {
		error(400, 'Invalid OAuth callback');
	}

	// Clear the state cookie
	cookies.delete('github_oauth_state', { path: '/' });

	const github = getGitHub();
	const tokens = await github.validateAuthorizationCode(code);
	const accessToken = tokens.accessToken();

	// Fetch the GitHub user
	const userRes = await fetch('https://api.github.com/user', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (!userRes.ok) {
		error(500, 'Failed to fetch GitHub user');
	}

	const githubUser: { login: string } = await userRes.json();
	const username = githubUser.login.toLowerCase();

	// Check whitelist
	const allowed = getAllowedUsers();
	if (allowed.length > 0 && !allowed.includes(username)) {
		error(403, 'You are not authorized to access the builder');
	}

	createSessionCookie(cookies, username);
	createTokenCookie(cookies, accessToken);
	redirect(302, '/builder');
};
