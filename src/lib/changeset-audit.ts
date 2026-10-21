/**
 * Audit of the pending changesets, kept free of release-specific state so it
 * can stay in the suite for good: `changeset version` deletes every pending
 * file, and the audit must still pass on the release PR and on every PR after
 * it. Dev-only PRs mark themselves with `changeset --empty` (an empty
 * frontmatter), which the audit accepts.
 *
 * Dev tooling only: this file is not part of the published package.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const PUBLISHED_PACKAGES = ["fancy-ui-svelte", "fancy-ui-react", "fancy-ui-vue"];

export interface AuditOptions {
	/**
	 * Per-release policy: changeset file name -> packages that must be a minor
	 * bump. An entry whose file no longer exists is skipped.
	 */
	minor?: Record<string, string[]>;
}

interface Parsed {
	bumps: Record<string, string>;
	stray: string[];
	body: string;
	hasFrontmatter: boolean;
}

function parse(text: string): Parsed {
	const m = text.match(/^---\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)([\s\S]*)$/m);
	const bumps: Record<string, string> = {};
	const stray: string[] = [];
	for (const raw of (m?.[1] ?? "").split("\n")) {
		const line = raw.trim();
		if (!line) continue;
		const b = line.match(/^"([^"]+)":\s*(major|minor|patch)$/);
		if (b) bumps[b[1]] = b[2];
		else stray.push(line);
	}
	return { bumps, stray, body: (m?.[2] ?? "").trim(), hasFrontmatter: !!m };
}

/** Problems found in a changeset directory, one readable line each (empty when clean). */
export function auditChangesets(dir: string, options: AuditOptions = {}): string[] {
	const problems: string[] = [];
	const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");

	for (const f of files) {
		const { bumps, stray, body, hasFrontmatter } = parse(readFileSync(join(dir, f), "utf8"));
		if (!hasFrontmatter) {
			problems.push(`${f}: missing frontmatter`);
			continue;
		}
		for (const line of stray) problems.push(`${f}: unrecognised frontmatter line "${line}"`);
		const names = Object.keys(bumps);
		// An empty frontmatter is the sanctioned `changeset --empty` for dev-only PRs.
		if (names.length === 0) continue;
		for (const name of names) {
			if (!PUBLISHED_PACKAGES.includes(name))
				problems.push(`${f}: "${name}" is not a published package`);
		}
		if (body.length <= 20) problems.push(`${f}: needs a summary of the change`);
	}

	for (const [f, pkgs] of Object.entries(options.minor ?? {})) {
		if (!existsSync(join(dir, f))) continue;
		const { bumps } = parse(readFileSync(join(dir, f), "utf8"));
		for (const p of pkgs) {
			if (bumps[p] !== "minor")
				problems.push(`${f}: ${p} should be a minor bump, found ${bumps[p] ?? "none"}`);
		}
	}
	return problems;
}
