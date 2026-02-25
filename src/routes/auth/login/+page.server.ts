import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isSupabaseConfigured, createSupabaseServerClient } from '$lib/server/supabase.server.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const githubConfigured = !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
	const supabaseConfigured = isSupabaseConfigured();

	return {
		providers: {
			supabase: supabaseConfigured,
			google: supabaseConfigured, // Google auth is via Supabase
			github: githubConfigured
		}
	};
};

export const actions: Actions = {
	email: async ({ request, cookies }) => {
		if (!isSupabaseConfigured()) return fail(400, { error: 'Supabase is not configured' });

		const form = await request.formData();
		const email = form.get('email') as string;
		const password = form.get('password') as string;

		if (!email || !password) return fail(400, { error: 'Email and password are required' });

		const supabase = createSupabaseServerClient(cookies);
		const { error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) return fail(400, { error: error.message });

		redirect(302, '/builder');
	},

	signup: async ({ request, cookies }) => {
		if (!isSupabaseConfigured()) return fail(400, { error: 'Supabase is not configured' });

		const form = await request.formData();
		const email = form.get('email') as string;
		const password = form.get('password') as string;

		if (!email || !password) return fail(400, { error: 'Email and password are required' });
		if (password.length < 6) return fail(400, { error: 'Password must be at least 6 characters' });

		const supabase = createSupabaseServerClient(cookies);
		const { error } = await supabase.auth.signUp({ email, password });

		if (error) return fail(400, { error: error.message });

		return { success: 'Check your email for a confirmation link' };
	},

	google: async ({ cookies, url }) => {
		if (!isSupabaseConfigured()) return fail(400, { error: 'Supabase is not configured' });

		const supabase = createSupabaseServerClient(cookies);
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${url.origin}/auth/callback/supabase`
			}
		});

		if (error) return fail(400, { error: error.message });
		if (data.url) redirect(302, data.url);
	}
};
