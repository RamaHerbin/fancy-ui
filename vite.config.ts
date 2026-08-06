import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// The dev server refuses to serve /package.json to the client (403), so the
// version is baked in at build time instead of imported.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
	define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
	plugins: [tailwindcss(), sveltekit()],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		setupFiles: ['./src/test-setup.ts']
	},
	resolve: {
		conditions: ['browser']
	}
});
