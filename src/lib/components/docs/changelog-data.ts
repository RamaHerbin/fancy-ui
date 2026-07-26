import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

export interface ChangelogSection {
	/** Raw heading text of the `###` bump group ("Minor Changes", …); "" for a preamble. */
	kind: string;
	/** Sanitized HTML rendered from the section's markdown body. */
	html: string;
}

export interface ChangelogVersion {
	version: string;
	date?: string;
	/** Stable heading id, e.g. "v0-7-0". */
	anchor: string;
	sections: ChangelogSection[];
}

function renderMarkdown(md: string): string {
	// Changeset commit-hash prefixes ("- 8eb3ae6: …") are noise for readers.
	const cleaned = md.replace(/^(\s*)- [0-9a-f]{7,}: /gm, "$1- ");
	const html = marked.parse(cleaned, { async: false, gfm: true }) as string;
	return DOMPurify.sanitize(html);
}

function parseSections(body: string): ChangelogSection[] {
	const sections: ChangelogSection[] = [];
	const re = /^### (.+)$/gm;
	const matches = [...body.matchAll(re)];
	const preamble = body.slice(0, matches.length ? matches[0].index : body.length).trim();
	if (preamble) sections.push({ kind: "", html: renderMarkdown(preamble) });
	for (let i = 0; i < matches.length; i++) {
		const start = matches[i].index + matches[i][0].length;
		const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
		const md = body.slice(start, end).trim();
		if (md) sections.push({ kind: matches[i][1].trim(), html: renderMarkdown(md) });
	}
	return sections;
}

/** Parse the root CHANGELOG.md (changesets format) into renderable versions, newest first. */
export function parseChangelog(raw: string): ChangelogVersion[] {
	const versions: ChangelogVersion[] = [];
	const re = /^## (.+)$/gm;
	const matches = [...raw.matchAll(re)];
	for (let i = 0; i < matches.length; i++) {
		const heading = matches[i][1].trim();
		// "0.1.0 — 2026-03-13" or just "0.7.0"
		const [, version, date] = heading.match(/^(\S+)(?:\s+—\s+(.+))?$/) ?? [];
		if (!version) continue;
		const start = matches[i].index + matches[i][0].length;
		const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
		versions.push({
			version,
			date: date?.trim(),
			anchor: `v${version.replaceAll(".", "-")}`,
			sections: parseSections(raw.slice(start, end)),
		});
	}
	return versions;
}
