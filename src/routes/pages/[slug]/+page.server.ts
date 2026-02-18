import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { PageDocument } from '$lib/builder/types/page.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;
	const filePath = join(process.cwd(), 'content', 'pages', `${slug}.json`);

	try {
		const raw = await readFile(filePath, 'utf-8');
		const page: PageDocument = JSON.parse(raw);

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
