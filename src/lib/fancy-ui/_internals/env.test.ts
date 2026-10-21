// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isDev } from './env.js';

const strip = (s: string) => s.replace(/^\s*\/\/.*$/gm, '');
const root = process.cwd() + '/';

describe('isDev', () => {
	it('is true under the test runner', () => {
		expect(typeof isDev).toBe('boolean');
		expect(isDev).toBe(true);
	});

	it.each([
		['src/lib/fancy-ui/_internals/env.ts'],
		['vue/src/internals/env.ts'],
		['react/src/components/fluid-cursor/dev.ts'],
		['react/src/components/fireworks-hdr/dev.ts'],
		['react/src/components/tooltip/Tooltip.tsx']
	])('%s reads the literal NODE_ENV a bundler rewrites, with no guard in front', (f) => {
		const src = strip(readFileSync(join(root, f), 'utf8'));
		expect(src).toMatch(/process\.env\.NODE_ENV/);
		expect(src).not.toMatch(/typeof process/);
		expect(src).not.toMatch(/globalThis[^;]*process/);
	});

	it('a bundler define turns the helper into a static flag', async () => {
		const { transformWithEsbuild } = await import('vite');
		const src = readFileSync(join(root, 'src/lib/fancy-ui/_internals/env.ts'), 'utf8');
		for (const [mode, want] of [
			['"development"', true],
			['"production"', false]
		] as const) {
			const out = await transformWithEsbuild(src, 'env.ts', {
				define: { 'process.env.NODE_ENV': mode }
			});
			const mod = await import(
				/* @vite-ignore */ 'data:text/javascript,' + encodeURIComponent(out.code)
			);
			expect(mod.isDev).toBe(want);
		}
	});
});

describe('shipped sources', () => {
	it('contain no literal bundler env chain', () => {
		const hits: string[] = [];
		const walk = (dir: string) => {
			for (const name of readdirSync(dir)) {
				const p = join(dir, name);
				if (statSync(p).isDirectory()) {
					if (name !== 'node_modules') walk(p);
				} else if (/\.(ts|tsx|svelte|vue)$/.test(name) && !/\.test\./.test(name)) {
					if (/import\.meta\.env/.test(strip(readFileSync(p, 'utf8')))) hits.push(p);
				}
			}
		};
		for (const d of ['src/lib/fancy-ui', 'react/src', 'vue/src']) walk(join(root, d));
		expect(hits).toEqual([]);
	});
});
