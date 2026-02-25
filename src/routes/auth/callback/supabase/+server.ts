import { redirect, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase.server.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');

	if (!code) {
		error(400, 'Missing authorization code');
	}

	const supabase = createSupabaseServerClient(cookies);
	const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

	if (authError) {
		error(500, `Authentication failed: ${authError.message}`);
	}

	redirect(302, '/builder');
};
