// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it, expect } from "vitest";
import { auditChangesets, PUBLISHED_PACKAGES } from "./changeset-audit.js";

const dirs: string[] = [];
function scratch(files: Record<string, string>): string {
	const dir = mkdtempSync(join(tmpdir(), "changesets-"));
	dirs.push(dir);
	mkdirSync(dir, { recursive: true });
	for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
	return dir;
}
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const BODY = "A sentence long enough to count as a real summary of the change.";
const ONE = (pkg: string, bump: string, body = BODY) => `---\n"${pkg}": ${bump}\n---\n\n${body}\n`;

/** Policy of the release being prepared; entries vanish from the check once `changeset version` consumes them. */
const RELEASE_MINOR: Record<string, string[]> = {
	"mosaic-glow-hdr.md": PUBLISHED_PACKAGES.slice(),
	"tick-nav.md": PUBLISHED_PACKAGES.slice(),
	"svelte-token-base.md": ["fancy-ui-svelte"],
	"overlays-keyboard-svelte.md": ["fancy-ui-svelte"],
	"overlays-keyboard-react.md": ["fancy-ui-react"],
	"overlays-keyboard-vue.md": ["fancy-ui-vue"],
	"sound-tap-palette.md": PUBLISHED_PACKAGES.slice(),
	"pixel-scene.md": PUBLISHED_PACKAGES.slice(),
};

describe("pending changesets in the repository", () => {
	it("pass the audit", () => {
		const dir = join(process.cwd(), ".changeset");
		expect(auditChangesets(dir, { minor: RELEASE_MINOR })).toEqual([]);
	});
});

describe("the audit as a permanent part of the suite", () => {
	it("passes once `changeset version` has consumed every changeset", () => {
		const dir = scratch({ "README.md": "# Changesets\n", "config.json": "{}" });
		expect(auditChangesets(dir, { minor: { "tick-nav.md": ["fancy-ui-svelte"] } })).toEqual([]);
	});

	it("accepts the changeset `--empty` writes for a dev-only change", () => {
		const dir = scratch({ "quiet-owls-sing.md": "---\n---\n\n" });
		expect(auditChangesets(dir)).toEqual([]);
	});

	it("skips minor-table entries whose changeset no longer exists", () => {
		const dir = scratch({ "kept.md": ONE("fancy-ui-svelte", "patch") });
		expect(auditChangesets(dir, { minor: { "gone.md": PUBLISHED_PACKAGES.slice() } })).toEqual([]);
	});

	it("flags a package that is not published", () => {
		const dir = scratch({ "x.md": ONE("some-other-pkg", "patch") });
		expect(auditChangesets(dir).join("\n")).toMatch(/x\.md.*some-other-pkg/);
	});

	it("flags a real bump without a summary", () => {
		const dir = scratch({ "x.md": ONE("fancy-ui-react", "patch", "tiny") });
		expect(auditChangesets(dir).join("\n")).toMatch(/x\.md.*summary/);
	});

	it("flags a frontmatter line that is not a package bump", () => {
		const dir = scratch({ "x.md": `---\n"fancy-ui-vue": patchy\n---\n\n${BODY}\n` });
		expect(auditChangesets(dir).join("\n")).toMatch(/x\.md.*frontmatter/);
	});

	it("flags a file without frontmatter", () => {
		const dir = scratch({ "x.md": BODY });
		expect(auditChangesets(dir).join("\n")).toMatch(/x\.md.*frontmatter/);
	});

	it("flags a bump that should be minor", () => {
		const dir = scratch({ "tick-nav.md": ONE("fancy-ui-svelte", "patch") });
		const problems = auditChangesets(dir, { minor: { "tick-nav.md": ["fancy-ui-svelte"] } });
		expect(problems.join("\n")).toMatch(/tick-nav\.md.*fancy-ui-svelte.*minor/);
	});
});
