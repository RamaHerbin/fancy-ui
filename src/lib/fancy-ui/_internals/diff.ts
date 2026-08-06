/**
 * Unified diff parser.
 *
 * Total and side-effect free: every input yields a value and nothing throws.
 * Malformed, truncated or headerless patches degrade to a best-effort reading,
 * so a patch that is still streaming in can be re-parsed on every chunk.
 */

export type DiffLineType = "add" | "del" | "context" | "meta";

/**
 * One line of a hunk. `text` drops the leading `+`/`-`/space marker; `meta`
 * lines (`\ No newline at end of file`) keep their raw text. A line number is
 * null on the side where the line does not exist.
 */
export interface DiffLine {
	type: DiffLineType;
	text: string;
	oldLine: number | null;
	newLine: number | null;
}

export interface DiffHunk {
	header: string;
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
	lines: DiffLine[];
}

export interface DiffFile {
	oldPath: string | null;
	newPath: string | null;
	hunks: DiffHunk[];
	additions: number;
	deletions: number;
	isNew: boolean;
	isDeleted: boolean;
	isRename: boolean;
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

const GIT_HEADER = "diff --git ";

interface State {
	files: DiffFile[];
	file: DiffFile | null;
	hunk: DiffHunk | null;
	oldLine: number;
	newLine: number;
	remainingOld: number;
	remainingNew: number;
}

function isBodyLine(line: string): boolean {
	const marker = line.charAt(0);
	return marker === "+" || marker === "-" || marker === " ";
}

/** Drops trailing timestamp metadata, surrounding quotes and the `a/` `b/` prefixes. */
function cleanPath(raw: string, stripAffix: boolean): string | null {
	let path = raw.replace(/\s+$/, "");
	const tab = path.indexOf("\t");
	if (tab !== -1) path = path.slice(0, tab).replace(/\s+$/, "");
	if (path.length > 1 && path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
	if (path === "/dev/null" || path === "") return null;
	if (stripAffix && (path.startsWith("a/") || path.startsWith("b/"))) path = path.slice(2);
	return path === "" ? null : path;
}

function gitHeaderPaths(line: string): [string | null, string | null] {
	const rest = line.slice(GIT_HEADER.length);
	// Greedy on purpose: a path may itself contain " b/".
	const paired = /^a\/(.*) b\/(.*)$/.exec(rest);
	if (paired) return [cleanPath(paired[1], false), cleanPath(paired[2], false)];
	const parts = rest.split(" ");
	if (parts.length < 2) return [null, null];
	return [cleanPath(parts[0], true), cleanPath(parts.slice(1).join(" "), true)];
}

function openFile(state: State): DiffFile {
	const file: DiffFile = {
		oldPath: null,
		newPath: null,
		hunks: [],
		additions: 0,
		deletions: 0,
		isNew: false,
		isDeleted: false,
		isRename: false,
	};
	state.files.push(file);
	state.file = file;
	state.hunk = null;
	return file;
}

function currentFile(state: State): DiffFile {
	return state.file ?? openFile(state);
}

function openHunk(state: State, hunk: DiffHunk): void {
	currentFile(state).hunks.push(hunk);
	state.hunk = hunk;
	state.oldLine = hunk.oldStart;
	state.newLine = hunk.newStart;
	state.remainingOld = hunk.oldCount;
	state.remainingNew = hunk.newCount;
}

function appendBody(state: State, raw: string): void {
	const hunk = state.hunk;
	const file = state.file;
	if (!hunk || !file) return;
	const marker = raw.charAt(0);
	const known = marker === "+" || marker === "-" || marker === " ";
	const text = known ? raw.slice(1) : raw;

	if (marker === "+") {
		hunk.lines.push({ type: "add", text, oldLine: null, newLine: state.newLine++ });
		file.additions++;
		if (state.remainingNew > 0) state.remainingNew--;
		return;
	}
	if (marker === "-") {
		hunk.lines.push({ type: "del", text, oldLine: state.oldLine++, newLine: null });
		file.deletions++;
		if (state.remainingOld > 0) state.remainingOld--;
		return;
	}
	// Space, empty, or anything unrecognised inside a hunk: treated as context.
	hunk.lines.push({ type: "context", text, oldLine: state.oldLine++, newLine: state.newLine++ });
	if (state.remainingOld > 0) state.remainingOld--;
	if (state.remainingNew > 0) state.remainingNew--;
}

export function parseUnifiedDiff(src: string): DiffFile[] {
	if (typeof src !== "string" || src.trim() === "") return [];

	const state: State = {
		files: [],
		file: null,
		hunk: null,
		oldLine: 0,
		newLine: 0,
		remainingOld: 0,
		remainingNew: 0,
	};

	const lines = src.split(/\r?\n/);
	if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

	for (const raw of lines) {
		if (state.hunk) {
			if (raw.startsWith("\\")) {
				state.hunk.lines.push({ type: "meta", text: raw, oldLine: null, newLine: null });
				continue;
			}
			// `---`/`+++` are ambiguous with content, so only unmistakable
			// boundaries end a hunk early; otherwise the declared counts do.
			const boundary = raw.startsWith(GIT_HEADER) || HUNK_HEADER.test(raw);
			const budget = state.remainingOld > 0 || state.remainingNew > 0;
			if (!boundary && (budget || isBodyLine(raw))) {
				appendBody(state, raw);
				continue;
			}
			state.hunk = null;
		}

		const header = HUNK_HEADER.exec(raw);
		if (header) {
			openHunk(state, {
				header: raw,
				oldStart: Number(header[1]),
				oldCount: header[2] === undefined ? 1 : Number(header[2]),
				newStart: Number(header[3]),
				newCount: header[4] === undefined ? 1 : Number(header[4]),
				lines: [],
			});
			continue;
		}
		if (raw.startsWith("@@")) continue;

		if (raw.startsWith(GIT_HEADER)) {
			const file = openFile(state);
			[file.oldPath, file.newPath] = gitHeaderPaths(raw);
			continue;
		}
		if (raw.startsWith("--- ")) {
			// A bare `---` with no `diff --git` above it starts the next file.
			const file = !state.file || state.file.hunks.length > 0 ? openFile(state) : state.file;
			file.oldPath = cleanPath(raw.slice(4), true);
			if (file.oldPath === null) file.isNew = true;
			continue;
		}
		if (raw.startsWith("+++ ")) {
			const file = currentFile(state);
			file.newPath = cleanPath(raw.slice(4), true);
			if (file.newPath === null) file.isDeleted = true;
			continue;
		}
		if (raw.startsWith("rename from ")) {
			const file = currentFile(state);
			file.isRename = true;
			file.oldPath = cleanPath(raw.slice("rename from ".length), false);
			continue;
		}
		if (raw.startsWith("rename to ")) {
			const file = currentFile(state);
			file.isRename = true;
			file.newPath = cleanPath(raw.slice("rename to ".length), false);
			continue;
		}
		if (raw.startsWith("new file mode")) {
			currentFile(state).isNew = true;
			continue;
		}
		if (raw.startsWith("deleted file mode")) {
			currentFile(state).isDeleted = true;
			continue;
		}
		if (isBodyLine(raw)) {
			openHunk(state, {
				header: "",
				oldStart: 1,
				oldCount: 0,
				newStart: 1,
				newCount: 0,
				lines: [],
			});
			appendBody(state, raw);
			continue;
		}
		// Index lines, binary notices and prose between files are ignored.
	}

	return state.files.filter(
		(file) =>
			file.hunks.length > 0 ||
			file.oldPath !== null ||
			file.newPath !== null ||
			file.isNew ||
			file.isDeleted ||
			file.isRename
	);
}
