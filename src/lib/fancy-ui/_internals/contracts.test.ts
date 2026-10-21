import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// CONTRACTS.md is the interaction law the three packages are reviewed against.
// A rule is only as good as the code it points at, so this suite keeps the
// document honest: six sections, each short enough to be read in one go, and
// every file it cites still present in the repo.

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const svelteRoot = resolve(repoRoot, "src/lib/fancy-ui");

const SECTIONS = [
	"State ownership",
	"Async feedback",
	"Live announcements",
	"Keyboard and touch",
	"Reduced motion",
	"Width stability",
];

function read(path: string): string | undefined {
	return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

/** `## ` sections of a markdown document, keyed by heading text. */
function sections(markdown: string): Map<string, string[]> {
	const out = new Map<string, string[]>();
	let current: string[] | undefined;
	for (const line of markdown.split("\n")) {
		const heading = /^## (.+)$/.exec(line);
		if (heading) {
			current = [];
			out.set(heading[1].replace(/^\d+\.\s*/, "").trim(), current);
		} else if (current) {
			current.push(line);
		}
	}
	return out;
}

/** Backticked tokens that name a file in the repo (a slash and a known extension). */
function citedPaths(markdown: string): string[] {
	const found = new Set<string>();
	for (const match of markdown.matchAll(/`([^`\s]+)`/g)) {
		const token = match[1].replace(/[:#].*$/, "");
		if (token.includes("/") && /\.(svelte|ts|tsx|vue|css|md|mjs|json)$/.test(token)) {
			found.add(token);
		}
	}
	return [...found];
}

function missing(paths: string[]): string[] {
	return paths.filter(
		(p) => !existsSync(resolve(repoRoot, p)) && !existsSync(resolve(svelteRoot, p))
	);
}

describe("CONTRACTS.md", () => {
	const doc = read(resolve(here, "CONTRACTS.md"));

	it("exists next to the internals it governs", () => {
		expect(doc).toBeTypeOf("string");
	});

	it("has exactly the six contract sections, in order", () => {
		expect([...sections(doc ?? "").keys()]).toEqual(SECTIONS);
	});

	it("keeps every section to 15 lines or fewer", () => {
		for (const [title, body] of sections(doc ?? "")) {
			const lines = body.filter((line) => line.trim() !== "");
			expect(lines.length, title).toBeLessThanOrEqual(15);
		}
	});

	it("cites real files only", () => {
		const paths = citedPaths(doc ?? "");
		expect(paths.length).toBeGreaterThan(10);
		expect(missing(paths)).toEqual([]);
	});
});

describe.each(["react", "vue"])("%s/PORTING.md interaction contracts", (pkg) => {
	const porting = read(resolve(repoRoot, pkg, "PORTING.md")) ?? "";
	const section = sections(porting).get("Interaction contracts");

	it("has an Interaction contracts section pointing at CONTRACTS.md", () => {
		expect(section).toBeDefined();
		expect((section ?? []).join("\n")).toContain("src/lib/fancy-ui/_internals/CONTRACTS.md");
	});

	it("maps the bindable triad to this framework", () => {
		const text = (section ?? []).join("\n");
		expect(text).toContain("$bindable");
		expect(text).toContain(pkg === "react" ? "defaultValue" : "v-model:");
		expect(text).toContain("onValueChange");
	});

	it("cites real files only", () => {
		expect(missing(citedPaths((section ?? []).join("\n")))).toEqual([]);
	});
});
