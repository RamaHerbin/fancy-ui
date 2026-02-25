import type { Cookies } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase.server.js';
import type { PageDocument } from '../types/page.js';
import type { PageStorage, PageListItem } from './types.js';
import { StorageError } from './errors.js';

interface SupabaseStorageConfig {
	cookies: Cookies;
}

export class SupabaseStorage implements PageStorage {
	private readonly cookies: Cookies;

	constructor(config: SupabaseStorageConfig) {
		this.cookies = config.cookies;
	}

	private get client() {
		return createSupabaseServerClient(this.cookies);
	}

	async list(): Promise<PageListItem[]> {
		const { data, error } = await this.client
			.from('pages')
			.select('slug, title, status, updated_at')
			.order('updated_at', { ascending: false });

		if (error) throw new StorageError('UNKNOWN', `Failed to list pages: ${error.message}`);

		return data.map((row) => ({
			slug: row.slug,
			title: row.title,
			status: row.status,
			updatedAt: row.updated_at
		}));
	}

	async get(slug: string): Promise<PageDocument> {
		const { data, error } = await this.client
			.from('pages')
			.select('document')
			.eq('slug', slug)
			.single();

		if (error) {
			if (error.code === 'PGRST116') throw StorageError.notFound(slug);
			throw new StorageError('UNKNOWN', `Failed to get page: ${error.message}`);
		}

		return data.document as PageDocument;
	}

	async save(page: PageDocument): Promise<void> {
		const now = new Date().toISOString();
		page.meta.updatedAt = now;

		// Try update first (by slug, RLS handles owner filtering)
		const { data: updated, error: updateError } = await this.client
			.from('pages')
			.update({
				title: page.meta.title,
				description: page.meta.description ?? null,
				status: page.meta.status,
				document: page as unknown as Record<string, unknown>
			})
			.eq('slug', page.meta.slug)
			.select('id');

		if (updateError) {
			throw new StorageError('UNKNOWN', `Failed to save page: ${updateError.message}`);
		}

		// If no rows updated, insert new
		if (!updated || updated.length === 0) {
			const {
				data: { user }
			} = await this.client.auth.getUser();
			if (!user) throw StorageError.auth('Not authenticated');

			const { error: insertError } = await this.client.from('pages').insert({
				owner_id: user.id,
				slug: page.meta.slug,
				title: page.meta.title,
				description: page.meta.description ?? null,
				status: page.meta.status,
				document: page as unknown as Record<string, unknown>
			});

			if (insertError) {
				if (insertError.code === '23505') throw StorageError.conflict(page.meta.slug);
				throw new StorageError('UNKNOWN', `Failed to create page: ${insertError.message}`);
			}
		}
	}

	async delete(slug: string): Promise<void> {
		const { data: deleted, error } = await this.client
			.from('pages')
			.delete()
			.eq('slug', slug)
			.select('id');

		if (error) throw new StorageError('UNKNOWN', `Failed to delete page: ${error.message}`);
		if (!deleted || deleted.length === 0) throw StorageError.notFound(slug);
	}

	async publish(slug: string): Promise<void> {
		const page = await this.get(slug);
		page.meta.status = 'published';

		const { data: updated, error } = await this.client
			.from('pages')
			.update({
				status: 'published',
				document: page as unknown as Record<string, unknown>
			})
			.eq('slug', slug)
			.select('id');

		if (error) throw new StorageError('UNKNOWN', `Failed to publish page: ${error.message}`);
		if (!updated || updated.length === 0) throw StorageError.notFound(slug);
	}
}
