import fs from "node:fs";
import path from "node:path";
import { hasFancyImport, hasTailwindImport, parseCssImports, tailwindPrefix } from "./css.js";

/**
 * The project's CSS files, the stylesheet sv knows about first, then `src/**\/*.css`
 * (no node_modules, no dot folders), as paths relative to `cwd`.
 */
export function cssCandidates(cwd: string, stylesheet: string, src = "src"): string[] {
	const found: string[] = [];
	const walk = (dir: string) => {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(path.join(cwd, dir), { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
			if (e.name.startsWith(".") || e.name === "node_modules") continue;
			const rel = path.posix.join(dir, e.name);
			if (e.isDirectory()) walk(rel);
			else if (e.isFile() && e.name.endsWith(".css")) found.push(rel);
		}
	};
	walk(src);
	return [stylesheet, ...found.filter((f) => f !== stylesheet)];
}

function read(cwd: string, file: string): string {
	try {
		return fs.readFileSync(path.join(cwd, file), "utf8");
	} catch {
		return "";
	}
}

export type CssPlan = {
	/** File that gets the import, null when one already has it or none imports Tailwind. */
	target: string | null;
	/** File that already imports fancy-ui-svelte/tailwind.css. */
	alreadyWired: string | null;
	/** Files that do not parse as CSS: skipped, reported in the next steps. */
	unparsable: string[];
	/** `prefix(...)` found on a Tailwind import (unsupported), with its file. */
	prefixed: { file: string; prefix: string } | null;
};

/** Which file gets the import: none if one already has it, else the first that imports Tailwind. */
export function planCss(cwd: string, stylesheet: string, src = "src"): CssPlan {
	const files = cssCandidates(cwd, stylesheet, src).map((f) => ({ f, content: read(cwd, f) }));
	const unparsable = files
		.filter(({ content }) => parseCssImports(content) === null)
		.map((x) => x.f);
	let prefixed: CssPlan["prefixed"] = null;
	for (const { f, content } of files) {
		const prefix = tailwindPrefix(content);
		if (prefix !== null) {
			prefixed = { file: f, prefix };
			break;
		}
	}
	const wired = files.find(({ content }) => hasFancyImport(content));
	if (wired) return { target: null, alreadyWired: wired.f, unparsable, prefixed };
	const tw = files.find(({ content }) => hasTailwindImport(content));
	return { target: tw?.f ?? null, alreadyWired: null, unparsable, prefixed };
}
