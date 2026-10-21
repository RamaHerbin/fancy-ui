// Fails when a built package still contains a raw bundler environment read.
// Usage: node scripts/check-dist-env.mjs [dir...]  (default: dist react/dist vue/dist, when present)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NEEDLE = 'import.meta.env';
const EXT = /\.(js|mjs|cjs|ts|svelte|vue|jsx|tsx)$/;

function* walk(dir) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const s = statSync(p);
		if (s.isDirectory()) yield* walk(p);
		else if (EXT.test(name)) yield p;
	}
}

const args = process.argv.slice(2);
const dirs = (args.length ? args : ['dist', 'react/dist', 'vue/dist']).filter(existsSync);
if (dirs.length === 0) {
	console.log('check-dist-env: no dist directory present, nothing to check');
	process.exit(0);
}
const hits = [];
for (const d of dirs) {
	for (const f of walk(d)) {
		const lines = readFileSync(f, 'utf8').split('\n');
		lines.forEach((l, i) => {
			if (l.includes(NEEDLE)) hits.push(`${f}:${i + 1}: ${l.trim()}`);
		});
	}
}
if (hits.length) {
	console.error(`check-dist-env: raw "${NEEDLE}" found in shipped output:\n${hits.join('\n')}`);
	process.exit(1);
}
console.log(`check-dist-env: ok (${dirs.join(', ')})`);
