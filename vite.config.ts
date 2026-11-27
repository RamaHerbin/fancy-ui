import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// The dev server refuses to serve /package.json to the client (403), so the
// version is baked in at build time instead of imported.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const reactPkg = JSON.parse(readFileSync(new URL('./react/package.json', import.meta.url), 'utf8'));
const vuePkg = JSON.parse(readFileSync(new URL('./vue/package.json', import.meta.url), 'utf8'));

export default defineConfig({
	define: {
		__PKG_VERSION__: JSON.stringify(pkg.version),
		__REACT_PKG_VERSION__: JSON.stringify(reactPkg.version),
		__VUE_PKG_VERSION__: JSON.stringify(vuePkg.version)
	},
	plugins: [tailwindcss(), sveltekit()],
	server: {
		watch: {
			// Agent worktrees live under .claude/worktrees/, inside this root: a
			// sibling session's `svelte-kit sync` there rewrites a tsconfig that
			// this watcher would otherwise treat as ours, clearing the cache and
			// forcing a full reload mid-request (500s until restart).
			ignored: ['**/.claude/**']
		}
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		setupFiles: ['./src/test-setup.ts']
	},
	resolve: {
		conditions: ['browser']
	}
});
