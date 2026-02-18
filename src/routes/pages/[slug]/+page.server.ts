import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import type { PageDocument } from '$lib/builder/types/page.js';
import type { PageServerLoad } from './$types.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;

	if (!SLUG_RE.test(slug)) {
		error(400, 'Invalid page slug');
	}

	const pagesDir = resolve(process.cwd(), 'content', 'pages');
	const filePath = join(pagesDir, `${slug}.json`);

	try {
		const raw = await readFile(filePath, 'utf-8');

		let page: PageDocument;
		try {
			page = JSON.parse(raw);
		} catch {
			error(500, 'Invalid page format');
		}

		if (page.version !== 1) {
			error(500, `Unsupported page version: ${page.version}`);
		}

		return { page };
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
			error(404, `Page not found: ${slug}`);
		}
		throw err;
	}
};
