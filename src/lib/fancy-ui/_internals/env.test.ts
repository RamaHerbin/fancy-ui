import { describe, expect, it } from 'vitest';
import { isDev } from './env.js';

describe('isDev', () => {
	it('is a boolean and true under the test runner', () => {
		expect(typeof isDev).toBe('boolean');
		expect(isDev).toBe(true);
	});
});

describe('shipped sources', () => {
	it('contain no literal bundler env chain', async () => {
		const { readFileSync } = await import('node:fs');
		for (const f of [
			'../tooltip/Tooltip.svelte',
			'../fireworks-hdr/FireworksHdr.svelte',
			'../fluid-cursor/FluidCursor.svelte',
			'./env.ts'
		]) {
			const src = readFileSync(new URL(f, import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
			expect(src, f).not.toMatch(/import\.meta\.env/);
		}
	});
});
