import { redirect, error } from '@sveltejs/kit';
import { verifySessionCookie } from '$lib/server/auth/index.js';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isBuilderRoute = pathname.startsWith('/builder');
	const isBuilderApi = pathname.startsWith('/api/builder');

	if (isBuilderRoute || isBuilderApi) {
		const session = verifySessionCookie(event.cookies);

		if (!session) {
			if (isBuilderApi) {
				error(401, 'Unauthorized');
			}
			redirect(302, '/auth/login');
		}

		event.locals.user = session;
	}

	return resolve(event);
};
