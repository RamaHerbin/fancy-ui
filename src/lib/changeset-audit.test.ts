// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const DIR = join(process.cwd(), ".changeset");
const PUBLISHED = ["fancy-ui-svelte", "fancy-ui-react", "fancy-ui-vue"];
const files = readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md");

function parse(file: string) {
	const text = readFileSync(join(DIR, file), "utf8");
	const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	const bumps: Record<string, string> = {};
	for (const line of (m?.[1] ?? "").split("\n")) {
		const b = line.match(/^"([^"]+)":\s*(major|minor|patch)\s*$/);
		if (b) bumps[b[1]] = b[2];
	}
	return { bumps, body: (m?.[2] ?? "").trim(), hasFrontmatter: !!m };
}

describe("pending changesets", () => {
	it("every changeset names at least one published package with a valid bump", () => {
		for (const f of files) {
			const { bumps, hasFrontmatter } = parse(f);
			expect(hasFrontmatter, f).toBe(true);
			expect(Object.keys(bumps).length, `${f} has an empty frontmatter`).toBeGreaterThan(0);
			for (const name of Object.keys(bumps)) expect(PUBLISHED, f).toContain(name);
		}
	});

	it("every changeset has a body", () => {
		for (const f of files) expect(parse(f).body.length, f).toBeGreaterThan(20);
	});

	it("new components and props are minor bumps", () => {
		const minor: Record<string, string[]> = {
			"mosaic-glow-hdr.md": PUBLISHED,
			"tick-nav.md": PUBLISHED,
			"svelte-token-base.md": ["fancy-ui-svelte"],
			"overlays-keyboard-svelte.md": ["fancy-ui-svelte"],
			"overlays-keyboard-react.md": ["fancy-ui-react"],
			"overlays-keyboard-vue.md": ["fancy-ui-vue"],
			"sound-tap-palette.md": PUBLISHED,
		};
		for (const [f, pkgs] of Object.entries(minor)) {
			const { bumps } = parse(f);
			for (const p of pkgs) expect(bumps[p], `${f} / ${p}`).toBe("minor");
		}
	});
});
