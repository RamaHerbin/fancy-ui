import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, clearTokenCookie } from '$lib/server/auth/index.js';
import {
	isSupabaseConfigured,
	createSupabaseServerClient
} from '$lib/server/supabase.server.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	if (locals.user?.provider === 'supabase' && isSupabaseConfigured()) {
		const supabase = createSupabaseServerClient(cookies);
		await supabase.auth.signOut();
	} else {
		clearSessionCookie(cookies);
		clearTokenCookie(cookies);
	}

	redirect(302, '/');
};
