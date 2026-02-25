import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function isSupabaseConfigured(): boolean {
	return !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
}

export function createSupabaseServerClient(cookies: Cookies) {
	return createServerClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cs) =>
				cs.forEach(({ name, value, options }) =>
					cookies.set(name, value, { ...options, path: '/' })
				)
		}
	});
}
