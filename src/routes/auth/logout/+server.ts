import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/auth/index.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies);
	redirect(302, '/');
};
