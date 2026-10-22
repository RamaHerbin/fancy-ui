import fs from "node:fs";
import path from "node:path";
import { hasFancyImport, hasTailwindImport } from "./css.js";

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

type CssPlan = { target: string | null; alreadyWired: string | null };

/** Which file gets the import: none if one already has it, else the first that imports Tailwind. */
export function planCss(cwd: string, stylesheet: string, src = "src"): CssPlan {
	const files = cssCandidates(cwd, stylesheet, src).map((f) => ({ f, content: read(cwd, f) }));
	const wired = files.find(({ content }) => hasFancyImport(content));
	if (wired) return { target: null, alreadyWired: wired.f };
	const tw = files.find(({ content }) => hasTailwindImport(content));
	return { target: tw?.f ?? null, alreadyWired: null };
}
