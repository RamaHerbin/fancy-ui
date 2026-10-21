import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { registry } from "$lib/fancy-ui/registry";
import { isNearUniform } from "../../../../scripts/lib/thumb-uniformity.mjs";
import thumbs from "./thumbs.json";

const root = join(process.cwd(), "static", "thumbs");
const manifest = thumbs as Record<string, boolean>;
const doneSlugs = Object.values(registry)
	.filter((c) => c.status === "done")
	.map((c) => c.slug);
// A blank 720x450 WebP is a few hundred bytes; the simplest real captures (a lone switch) are ~1.3 KB.
const MIN_BYTES = 1024;

describe("gallery thumbnail manifest", () => {
	it("has an explicit true/false entry for every done registry slug", () => {
		const missing = doneSlugs.filter((s) => typeof manifest[s] !== "boolean");
		expect(missing).toEqual([]);
	});

	it("lists no slug that is not in the registry", () => {
		const known = new Set(doneSlugs);
		expect(Object.keys(manifest).filter((s) => !known.has(s))).toEqual([]);
	});

	it("has both theme files for every true entry, none under 1 KB", () => {
		const problems: string[] = [];
		for (const [slug, ok] of Object.entries(manifest)) {
			if (!ok) continue;
			for (const theme of ["dark", "light"]) {
				const file = join(root, theme, `${slug}.webp`);
				if (!existsSync(file)) problems.push(`${theme}/${slug}: missing`);
				else if (statSync(file).size < MIN_BYTES) problems.push(`${theme}/${slug}: under 1 KB`);
			}
		}
		expect(problems).toEqual([]);
	});
});

describe("isNearUniform", () => {
	const frame = (
		w: number,
		h: number,
		fill: (x: number, y: number) => [number, number, number]
	) => {
		const data = new Uint8ClampedArray(w * h * 4);
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++) {
				const [r, g, b] = fill(x, y);
				data.set([r, g, b, 255], (y * w + x) * 4);
			}
		return data;
	};
	it("flags a flat frame", () => {
		expect(
			isNearUniform(
				frame(40, 25, () => [10, 10, 10]),
				40,
				25
			)
		).toBe(true);
	});
	it("flags a frame with a few stray pixels", () => {
		const d = frame(40, 25, () => [10, 10, 10]);
		d.set([255, 255, 255, 255], 0);
		expect(isNearUniform(d, 40, 25)).toBe(true);
	});
	it("accepts a frame with real content", () => {
		const d = frame(40, 25, (x, y) =>
			x > 10 && x < 30 && y > 6 && y < 18 ? [240, 240, 240] : [10, 10, 10]
		);
		expect(isNearUniform(d, 40, 25)).toBe(false);
	});
});
