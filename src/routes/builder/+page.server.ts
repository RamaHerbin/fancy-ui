import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { PageDocument } from '$lib/builder/types/page.js';
import type { PageServerLoad } from './$types.js';

export interface PageListItem {
	slug: string;
	title: string;
	status: string;
	updatedAt: string;
}

export const load: PageServerLoad = async () => {
	const dir = join(process.cwd(), 'content', 'pages');

	let files: string[];
	try {
		files = await readdir(dir);
	} catch {
		return { pages: [] as PageListItem[] };
	}

	const pages: PageListItem[] = [];

	for (const file of files) {
		if (!file.endsWith('.json')) continue;

		try {
			const raw = await readFile(join(dir, file), 'utf-8');
			const doc: PageDocument = JSON.parse(raw);
			pages.push({
				slug: doc.meta.slug,
				title: doc.meta.title,
				status: doc.meta.status,
				updatedAt: doc.meta.updatedAt
			});
		} catch {
			// Skip invalid files
		}
	}

	pages.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

	return { pages };
};
