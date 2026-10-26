#!/usr/bin/env node
/**
 * Static census of a component folder for the design & motion rubric: axes A1
 * (motion-token conformance) and the static half of A2 (reduced-motion
 * contract), plus the A4 teardown/offscreen heuristics and the render / motion
 * class fields of a record. Deterministic and idempotent: no timestamps, sorted
 * traversal, and a file is rewritten only when its content changes.
 *
 * A1: every `cubic-bezier()` / duration literal in `src/lib/fancy-ui/<slug>/` is
 * classified against `_internals/motion/tokens.ts` as on-token, justified (a
 * nearby comment names why), ambient-loop (an `infinite` animation of a second
 * or more is excluded) or OFF-TOKEN. Inline `style=` / `style:` motion in markup
 * is read too, not only `<style>` blocks.
 *
 * A2 (static half): every transform / opacity / filter transition or keyframe
 * must sit inside `@media (prefers-reduced-motion: no-preference)`, or the
 * folder must carry a blanket `@media (prefers-reduced-motion: reduce)` override
 * that neutralises it (rule R9: animation / transition none or paused, a
 * duration of 100 ms or less, `transform: none`, or a transition cut down to
 * opacity and colour). Colour-only transitions are exempt.
 *
 * Usage:
 *   node scripts/audit/static.mjs [--repo <dir>] [--out <dir>] [--inventory <file>]
 *                                 [--only slug,slug] [--self-test]
 *
 *   --repo        repository root (default: the checkout this script lives in)
 *   --out         evidence root (default: <repo>/.audit-out/audit); writes per slug
 *                 components/<slug>/evidence/static.txt and partial-S1.json, and,
 *                 without --only, logs/S1b-census.md
 *   --inventory   inventory.json (default: <out>/inventory.json; build it with
 *                 scripts/audit/inventory.mjs)
 *   --only        comma list of slugs
 *   --self-test   run the built-in parser cases and exit
 *
 * What this does NOT catch: motion declared in a helper module outside the
 * folder (it only reads `_internals/motion` imports and notes who self-gates),
 * a selector that the R9 override does not actually reach (reported as
 * "selector coverage not proven", confirm with rm-check.mjs), shader or canvas
 * cost, and anything that only shows at runtime. Static evidence is half of A2;
 * the dynamic half is rm-check.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { isMain, loadInventory, parseArgs, parseList, resolvePaths } from "./lib.mjs";

// Context filled by configure(): the checkout being read and the token set.
let REPO = "";
let SRC = "";
let TOKEN_CURVES = new Set();
const TOKEN_MS = new Set([80, 150, 300, 200, 600, 15, 20, 40, 50]); // DURATIONS + STAGGERS + STAGGER_CAPS

/** Point the census at a checkout and read its token curves from tokens.ts. */
export function configure(repo, tokensSrc) {
	REPO = repo;
	SRC = path.join(repo, "src", "lib", "fancy-ui");
	const text =
		tokensSrc ?? fs.readFileSync(path.join(SRC, "_internals", "motion", "tokens.ts"), "utf8");
	TOKEN_CURVES = new Set(
		[...text.matchAll(/cubic-bezier\(([^)]*)\)/g)].map((m) => normCurve(m[1]))
	);
}

/** Normalise "0.16, 1, .3, 1" to "0.16,1,0.3,1" so spellings compare equal. */
export function normCurve(s) {
	return s
		.split(",")
		.map((x) => String(parseFloat(x.trim())))
		.join(",");
}

const COLOR_PROPS = new Set([
	"color",
	"background-color",
	"border-color",
	"outline-color",
	"fill",
	"stroke",
	"text-decoration-color",
	"caret-color",
	"accent-color",
	"background",
	"border",
	"border-top-color",
	"border-bottom-color",
	"border-left-color",
	"border-right-color",
	"column-rule-color",
	"text-emphasis-color",
	"stop-color",
	"outline",
	"text-decoration",
]);
const TFO_PROPS = new Set([
	"transform",
	"translate",
	"scale",
	"rotate",
	"opacity",
	"filter",
	"backdrop-filter",
	"all",
]);
const LAYOUT_RE =
	/^(width|height|min-width|max-width|min-height|max-height|top|left|right|bottom|inset|margin(-\w+)?|padding(-\w+)?|flex(-\w+)?|grid-template(-\w+)?|gap|row-gap|column-gap|font-size|line-height|letter-spacing)$/;
const OTHER_MOTION =
	/^(clip-path|mask(-\w+)?|stroke-dashoffset|stroke-dasharray|background-position(-\w+)?|d|offset-distance|offset-path|box-shadow|text-shadow|border-radius|visibility|display)$/;
const REDUCED_REF =
	/createReducedMotion|prefersReducedMotion|REDUCED_MOTION_QUERY|prefers-reduced-motion|reducedMotion|motion-reduce:|motion-safe:/;

// ---------- file reading ----------
function listFiles(dir, filter) {
	const out = [];
	if (!fs.existsSync(dir)) return out;
	const walk = (d) => {
		for (const e of fs
			.readdirSync(d, { withFileTypes: true })
			.sort((a, b) => (a.name < b.name ? -1 : 1))) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (filter(e.name)) out.push(p);
		}
	};
	walk(dir);
	return out;
}
const isSource = (n) =>
	/\.(svelte|ts)$/.test(n) &&
	!/\.(test|spec)\.(ts|svelte)$/.test(n) &&
	!/\.test\.svelte$/.test(n) &&
	!n.endsWith(".d.ts");

// Region per line: 'script' | 'style' | 'markup'. Returns {lines, code, region}
// `code` = lines with comments blanked (same line numbering).
function loadFile(abs) {
	return loadFileText(abs, fs.readFileSync(abs, "utf8"));
}
export function loadFileText(abs, text) {
	const lines = text.split("\n");
	const isSvelte = abs.endsWith(".svelte");
	const region = new Array(lines.length).fill(isSvelte ? "markup" : "script");
	if (isSvelte) {
		let cur = "markup";
		let inHtmlComment = false;
		for (let i = 0; i < lines.length; i++) {
			let l = lines[i];
			if (cur === "markup") {
				// ignore <script>/<style> mentioned inside HTML comments
				let out = "",
					rest = l;
				for (;;) {
					if (inHtmlComment) {
						const e = rest.indexOf("-->");
						if (e < 0) {
							rest = "";
							break;
						}
						rest = rest.slice(e + 3);
						inHtmlComment = false;
					}
					const b = rest.indexOf("<!--");
					if (b < 0) {
						out += rest;
						break;
					}
					out += rest.slice(0, b);
					rest = rest.slice(b + 4);
					inHtmlComment = true;
				}
				l = out;
			}
			if (cur === "markup") {
				if (/<script\b/.test(l)) cur = "script";
				else if (/<style\b/.test(l)) cur = "style";
			}
			region[i] = cur;
			if (cur === "script" && /<\/script>/.test(l)) cur = "markup";
			else if (cur === "style" && /<\/style>/.test(l)) cur = "markup";
		}
	}
	// blank block comments and html comments (preserve newlines)
	// per-region so a `/*` inside a script string cannot swallow the <style> block
	const blank = (m) => m.replace(/[^\n]/g, " ");
	const segs = [];
	for (let i = 0; i < lines.length; ) {
		let j = i;
		while (j < lines.length && region[j] === region[i]) j++;
		let seg = lines.slice(i, j).join("\n");
		seg = seg.replace(/\/\*[\s\S]*?\*\//g, blank);
		if (region[i] === "markup") seg = seg.replace(/<!--[\s\S]*?-->/g, blank);
		segs.push(seg);
		i = j;
	}
	const t = segs.join("\n");
	const code = t.split("\n").map((l, i) => {
		if (region[i] === "script") return l.replace(/(^|[^:"'`\\])\/\/.*$/, "$1");
		return l;
	});
	return { abs, rel: REPO ? path.relative(REPO, abs) : abs, lines, code, region };
}

// ---------- CSS parse of <style> regions ----------
// Returns { decls: [{file,line,prop,value,ancestors:[header]}], keyframes: {name:{props:Set,line}} , spans:[{kind,start,end,header}] }
export function parseCss(f) {
	const out = { decls: [], keyframes: {}, spans: [] };
	const stack = [];
	let buf = "";
	let bufLine = 0;
	for (let i = 0; i < f.code.length; i++) {
		if (f.region[i] !== "style") {
			continue;
		}
		const line = f.code[i].replace(/<style\b[^>]*>/, "").replace(/<\/style>/, "");
		for (let c = 0; c < line.length; c++) {
			const ch = line[c];
			if (ch === "{") {
				const header = buf.trim().replace(/\s+/g, " ");
				stack.push({ header, startLine: i + 1 });
				buf = "";
				bufLine = 0;
			} else if (ch === "}") {
				flushDecl();
				const top = stack.pop();
				if (top && /^@media/.test(top.header)) {
					if (/prefers-reduced-motion\s*:\s*no-preference/.test(top.header))
						out.spans.push({
							kind: "no-preference",
							start: top.startLine,
							end: i + 1,
							header: top.header,
						});
					else if (/prefers-reduced-motion\s*:\s*reduce/.test(top.header))
						out.spans.push({
							kind: "reduce",
							start: top.startLine,
							end: i + 1,
							header: top.header,
						});
					else if (/hover\s*:\s*hover/.test(top.header))
						out.spans.push({
							kind: "hover-gate",
							start: top.startLine,
							end: i + 1,
							header: top.header,
						});
				}
				buf = "";
			} else if (ch === ";") {
				flushDecl();
				buf = "";
			} else {
				if (buf.trim() === "") bufLine = i + 1;
				buf += ch;
			}
		}
		buf += " ";
	}
	function flushDecl() {
		const s = buf.trim();
		if (!s || stack.length === 0) return;
		const m = s.match(/^([-\w]+)\s*:\s*([\s\S]*)$/);
		if (!m) return;
		// skip selectors like `a:hover` (no value terminator) — real decls only reach here from `;`/`}` inside a rule
		const anc = stack.map((x) => x.header);
		out.decls.push({
			file: f.rel,
			line: bufLine || stack[stack.length - 1].startLine,
			prop: m[1].toLowerCase(),
			value: m[2].trim().replace(/\s+/g, " "),
			anc,
		});
		const kf = anc.find((h) => /^@(-webkit-)?keyframes\b/.test(h));
		if (kf) {
			const name = kf.replace(/^@(-webkit-)?keyframes\s+/, "").trim();
			(out.keyframes[name] ??= {
				props: new Set(),
				line: stack.find((x) => x.header === kf).startLine,
				file: f.rel,
			}).props.add(m[1].toLowerCase());
		}
	}
	// register keyframes with no decls too
	return out;
}
export function splitTop(v) {
	const parts = [];
	let d = 0,
		cur = "";
	for (const ch of v) {
		if (ch === "(") d++;
		if (ch === ")") d--;
		if (ch === "," && d === 0) {
			parts.push(cur.trim());
			cur = "";
		} else cur += ch;
	}
	if (cur.trim()) parts.push(cur.trim());
	return parts;
}
export function timeLiterals(s) {
	// returns ms values for literals like 300ms, .3s, 0.25s ; ignores var(--x) names
	const res = [];
	for (const m of s.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)) {
		const n = parseFloat(m[1]);
		res.push({ raw: m[0], ms: Math.round((m[2] === "s" ? n * 1000 : n) * 1000) / 1000 });
	}
	return res;
}
export const gateOf = (anc) =>
	anc.some((h) => /^@media.*prefers-reduced-motion\s*:\s*no-preference/.test(h))
		? "gated"
		: anc.some((h) => /^@media.*prefers-reduced-motion\s*:\s*reduce/.test(h))
			? "reduce"
			: "ungated";
const isKeyframes = (anc) => anc.some((h) => /^@(-webkit-)?keyframes\b/.test(h));

// ---------- S1b: markup motion scanner (inline style="", style:directives, reduce-aware {#if} branches) ----------
// Returns { items, masked, branchLine } for a .svelte file.
//  items: [{line, kind:'style-attr'|'style-directive', text, gated, why}]  (only tfo-kind motion)
//  masked: code lines with style="..." attribute text blanked (so tailwind/directive regexes ignore it)
//  branchLine: boolean per line — true if the line sits inside an {#if} whose condition mentions reduce
export function scanMarkup(f, keyframes) {
	const empty = { items: [], masked: f.code, branchLine: new Array(f.code.length).fill(false) };
	if (!f.abs.endsWith(".svelte")) return empty;
	const lines = f.code.map((l, i) => (f.region[i] === "markup" ? l : l.replace(/[^\n]/g, " ")));
	const text = lines.join("\n");
	const lineStarts = [0];
	for (let i = 0; i < lines.length; i++) lineStarts.push(lineStarts[i] + lines[i].length + 1);
	const lineOf = (pos) => {
		let lo = 0,
			hi = lines.length - 1;
		while (lo < hi) {
			const m = (lo + hi + 1) >> 1;
			if (lineStarts[m] <= pos) lo = m;
			else hi = m - 1;
		}
		return lo;
	};
	// {#if} events
	const events = [];
	for (const m of text.matchAll(/\{(#if|:else if|:else|\/if)\b([^}]*)\}/g))
		events.push({ pos: m.index, kind: m[1], cond: m[2] });
	const stackAt = (pos) => {
		const st = [];
		for (const e of events) {
			if (e.pos >= pos) break;
			if (e.kind === "#if") st.push({ aware: /reduce/i.test(e.cond) });
			else if (e.kind === ":else if") {
				if (st.length && /reduce/i.test(e.cond)) st[st.length - 1].aware = true;
			} else if (e.kind === "/if") st.pop();
		}
		return st;
	};
	const branchLine = lines.map((_, i) => stackAt(lineStarts[i]).some((x) => x.aware));
	const scriptText = f.code.filter((_, i) => f.region[i] === "script").join("\n");
	const exprGatedByScript = (expr) => {
		for (const id of new Set(expr.match(/[A-Za-z_$][\w$]*/g) ?? [])) {
			const re = new RegExp(`(?:const|let|var)\\s+${id.replace(/\$/g, "\\$")}\\b([^;]*;?[^;]*;?)`);
			const m = scriptText.match(re);
			if (m && /reduce/i.test(m[0].slice(0, 400))) return id;
		}
		return null;
	};
	const items = [];
	const maskRanges = [];
	const readValue = (t, i) => {
		// t[i] is first char of attribute value; returns [valueText, endIndexExclusive]
		const q = t[i];
		if (q === '"' || q === "'") {
			let d = 0,
				j = i + 1;
			for (; j < t.length; j++) {
				if (t[j] === "{") d++;
				else if (t[j] === "}") d--;
				else if (t[j] === q && d <= 0) break;
			}
			return [t.slice(i + 1, j), j + 1];
		}
		if (q === "{") {
			let d = 0,
				j = i;
			for (; j < t.length; j++) {
				if (t[j] === "{") d++;
				else if (t[j] === "}") {
					d--;
					if (d === 0) break;
				}
			}
			return [t.slice(i + 1, j), j + 1];
		}
		const m = t.slice(i).match(/^[^\s>]*/);
		return [m[0], i + m[0].length];
	};
	const analyse1 = (value, tagText, absStart, kind) => {
		// value: css text possibly with {expr}. Returns list of {prop, desc}
		const gatedExpr = /reduce/i.test(value);
		const exprs = [...value.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
		const viaScript = exprs.map(exprGatedByScript).find(Boolean);
		const flat = value.replace(/\{[^{}]*\}/g, "X");
		const res = [];
		for (const m of flat.matchAll(
			/(?:^|[;\s])(transition-property|transition-duration|transition|animation-name|animation)\s*:\s*([^;]*)/g
		)) {
			const prop = m[1],
				val = m[2].trim();
			if (/^(none|X)?$/.test(val) && prop !== "transition-property") {
				if (val === "none" || val === "") continue;
			}
			let tfo = false,
				desc = "";
			if (prop === "transition" || prop === "transition-property") {
				for (const seg of splitTop(val)) {
					const p = prop === "transition" ? seg.split(/\s+/)[0] : seg.trim();
					if (TFO_PROPS.has(p)) tfo = true;
				}
			} else if (prop === "transition-duration") {
				tfo =
					/transform|opacity|filter|translate|scale/.test(flat) ||
					/transition-(all|transform|opacity)/.test(tagText);
			} else {
				const names = Object.keys(keyframes).filter((k) =>
					new RegExp(`(^|[\\s,])${k}([\\s,;]|$)`).test(val)
				);
				if (names.length)
					tfo = names.some((n) => [...keyframes[n].props].some((q) => TFO_PROPS.has(q)));
				else tfo = !/^(none|X)$/.test(val.split(/\s+/)[0]); // unresolved keyframes: assume transform/opacity
				desc = names.length ? "" : " (keyframes not resolved in-dir)";
			}
			if (!tfo) continue;
			const rel = m.index + m[0].indexOf(prop);
			res.push({
				prop,
				val: val.slice(0, 80),
				desc,
				pos: absStart + (kind === "attr" ? rel : 0),
				gatedExpr,
				viaScript,
			});
		}
		return res;
	};
	let ti = 0;
	for (const tm of text.matchAll(/<([A-Za-z][\w.:-]*)/g)) {
		const start = tm.index;
		if (start < ti) continue;
		// find tag end
		let d = 0,
			q = null,
			j = start + tm[0].length;
		for (; j < text.length; j++) {
			const c = text[j];
			if (q) {
				if (c === q && d === 0) q = null;
				else if (c === "{") d++;
				else if (c === "}") d--;
				continue;
			}
			if (c === "{") d++;
			else if (c === "}") d--;
			else if ((c === '"' || c === "'") && d === 0) q = c;
			else if (c === ">" && d <= 0) break;
		}
		const tag = text.slice(start, j + 1);
		ti = j + 1;
		const elementGated = /motion-safe:|motion-reduce:/.test(tag);
		const branchGated = stackAt(start).some((x) => x.aware);
		const found = [];
		for (const am of tag.matchAll(/(?<![\w:-])style\s*=\s*/g)) {
			const vi = am.index + am[0].length;
			const [val, end] = readValue(tag, vi);
			maskRanges.push([start + vi, start + end]);
			for (const r of analyse1(val, tag, start + vi, "attr"))
				found.push({ ...r, kind: "style-attr" });
		}
		for (const dm of tag.matchAll(/(?<![\w-])style:([\w-]+)\s*(?:=\s*)?/g)) {
			const prop = dm[1];
			if (
				!/^(transition|transition-property|transition-duration|animation|animation-name)$/.test(
					prop
				)
			)
				continue;
			const vi = dm.index + dm[0].length;
			let val = "";
			if (dm[0].includes("=")) {
				const [v, end] = readValue(tag, vi);
				val = v;
				maskRanges.push([start + vi, start + end]);
			}
			const synth = `${prop}: ${val.replace(/^\{|\}$/g, "") || "X"}`;
			for (const r of analyse1(synth, tag, start + dm.index, "dir"))
				found.push({
					...r,
					kind: "style-directive",
					gatedExpr: r.gatedExpr || /reduce/i.test(val),
				});
		}
		for (const r of found) {
			const gated = elementGated || branchGated || r.gatedExpr || !!r.viaScript;
			const why = elementGated
				? "element has motion-safe:/motion-reduce: class"
				: branchGated
					? "inside reduce-aware {#if} branch"
					: r.gatedExpr
						? "value expression references reduced motion"
						: r.viaScript
							? `value derived from reduced-motion-aware \`${r.viaScript}\``
							: "";
			items.push({
				line: lineOf(r.pos) + 1,
				kind: r.kind,
				text: `${r.prop}: ${r.val}${r.desc}`,
				gated,
				why,
			});
		}
	}
	// masked copy
	let mtext = text.split("");
	for (const [a, b] of maskRanges)
		for (let k = a; k < Math.min(b, mtext.length); k++) if (mtext[k] !== "\n") mtext[k] = " ";
	const mlines = mtext.join("").split("\n");
	const masked = f.code.map((l, i) => (f.region[i] === "markup" ? mlines[i] : l));
	return { items, masked, branchLine };
}

// ---------- main analysis per slug ----------
const GREP_FILES = (slug) => `src/lib/fancy-ui/${slug}/*.svelte src/lib/fancy-ui/${slug}/*.ts`;

export function analyse(item) {
	const slug = item.slug;
	const dir = `${SRC}/${slug}`;
	const files = listFiles(dir, isSource).map(loadFile);
	const ev = []; // evidence lines
	const refs = {}; // named line refs into static.txt
	const add = (s, key) => {
		ev.push(s);
		if (key) (refs[key] ??= []).push(ev.length);
	};
	const section = (t) => {
		if (ev.length) ev.push("");
		ev.push(`## ${t}`);
	};

	const react = listFiles(`${REPO}/react/src/components/${slug}`, () => true).map((p) =>
		path.relative(REPO, p)
	);
	const vue = listFiles(`${REPO}/vue/src/components/${slug}`, () => true).map((p) =>
		path.relative(REPO, p)
	);
	add(`# static evidence for ${slug} (svelte dir: src/lib/fancy-ui/${slug}/)`);
	add(`# source files: ${files.map((f) => path.basename(f.rel)).join(", ") || "(none)"}`);
	add(
		`# react mirror: ${react.length ? react.length + " files" : "MISSING"} | vue mirror: ${vue.length ? vue.length + " files" : "MISSING"}`
	);

	const css = files.map((f) => ({ f, css: f.abs.endsWith(".svelte") ? parseCss(f) : null }));
	const allDecls = css.flatMap((c) => (c.css ? c.css.decls : []));
	const keyframes = {};
	for (const c of css) if (c.css) Object.assign(keyframes, c.css.keyframes);
	const spans = css.flatMap((c) =>
		c.css ? c.css.spans.map((s) => ({ ...s, file: c.f.rel })) : []
	);

	// --- A1 literals ---
	section(
		"A1 literals (cubic-bezier / ms / s) — [on-token] | [OFF-TOKEN] | [justified] | [ambient-loop, excluded] | [ignored: colour-only|reduce-block]"
	);
	const offTokens = []; // {kind,raw,file,line,evLine,justified}
	const onTokenCount = { curves: 0, durations: 0 };
	const noteJustified = (f, lineNo) => {
		// comment on same line or up to 2 lines before, with a rationale keyword
		for (let k = lineNo - 1; k >= Math.max(0, lineNo - 3); k--) {
			const raw = f.lines[k] ?? "";
			if (
				/(\/\*|\/\/|<!--)/.test(raw) &&
				/(off-token|deliberate|intentional|on purpose|precedent|because|why:|matches|mirror|same as|distinct|by design|tuned)/i.test(
					raw
				)
			)
				return true;
		}
		return false;
	};
	const fileByRel = Object.fromEntries(files.map((f) => [f.rel, f]));
	const lit = (kind, raw, file, line, tag, extra = "") => {
		const f = fileByRel[file];
		let status = tag;
		if (tag === "token") status = "on-token";
		else if (tag === "off") {
			const just = f && noteJustified(f, line - 1);
			status = just ? "justified" : "OFF-TOKEN";
		}
		add(`${file}:${line}: ${kind} ${raw} [${status}]${extra ? " " + extra : ""}`, "lit");
		if (status === "OFF-TOKEN") offTokens.push({ kind, raw, file, line, evLine: ev.length });
		if (status === "on-token") onTokenCount[kind === "curve" ? "curves" : "durations"]++;
	};
	const handledLines = new Set();
	for (const d of allDecls) {
		const g = gateOf(d.anc);
		const isAnim = /^animation/.test(d.prop);
		const isTrans = /^transition/.test(d.prop);
		const isCustom = d.prop.startsWith("--");
		const key = `${d.file}:${d.line}`;
		if (g === "reduce") continue;
		if (!(isAnim || isTrans || isCustom || /cubic-bezier/.test(d.value))) continue;
		if (isKeyframes(d.anc) && !/cubic-bezier/.test(d.value) && !/animation-timing/.test(d.prop))
			continue;
		// split transition shorthand per segment; skip colour-only segments
		let segs = [d.value];
		if (d.prop === "transition" || d.prop === "transition-property") segs = splitTop(d.value);
		let anyHandled = false;
		for (const seg of segs) {
			if (d.prop === "transition") {
				const first = seg.split(/\s+/)[0];
				if (COLOR_PROPS.has(first)) {
					add(`${d.file}:${d.line}: transition segment "${seg}" [ignored: colour-only]`);
					continue;
				}
			}
			for (const m of seg.matchAll(/cubic-bezier\(([^)]*)\)/g)) {
				const n = normCurve(m[1]);
				lit(
					"curve",
					m[0].replace(/\s+/g, ""),
					d.file,
					d.line,
					TOKEN_CURVES.has(n) ? "token" : "off"
				);
				anyHandled = true;
			}
			if (d.prop === "transition-property") continue;
			for (const t of timeLiterals(seg)) {
				if (t.ms <= 1) continue; // 0ms / 0.01ms reduced-motion style overrides
				if (isAnim && t.ms >= 1000 && !/animation-delay/.test(d.prop)) {
					lit("duration", t.raw, d.file, d.line, "ambient-loop, excluded");
					anyHandled = true;
					continue;
				}
				lit("duration", t.raw, d.file, d.line, TOKEN_MS.has(t.ms) ? "token" : "off");
				anyHandled = true;
			}
		}
		if (anyHandled) handledLines.add(key);
	}
	// markup/script literals (tailwind arbitrary classes, inline style strings, JS option keys)
	for (const f of files) {
		for (let i = 0; i < f.code.length; i++) {
			const l = f.code[i];
			const reg = f.region[i];
			if (reg === "style") continue;
			const rel = f.rel;
			// cubic-bezier in markup/script
			for (const m of l.matchAll(/cubic-bezier\(([^)]*)\)/g)) {
				if (reg === "script" && /EASINGS\s*=|tokens\.ts/.test(f.rel)) continue;
				lit(
					"curve",
					m[0].replace(/\s+/g, ""),
					rel,
					i + 1,
					TOKEN_CURVES.has(normCurve(m[1])) ? "token" : "off"
				);
			}
			// tailwind duration-NNN / duration-[..] / delay-NNN
			for (const m of l.matchAll(
				/(?<![\w-])(?:[a-z-]+:)*(duration|delay)-(\[?)(\d*\.?\d+)(ms|s)?\]?/g
			)) {
				const n = parseFloat(m[3]);
				const ms = m[4] === "s" ? n * 1000 : n;
				if (ms <= 1) continue;
				lit(
					"duration",
					m[0].replace(/^.*:/, ""),
					rel,
					i + 1,
					TOKEN_MS.has(ms) ? "token" : "off",
					"(tailwind)"
				);
			}
			// JS option keys duration: N / delay: N (script) and inline style strings
			if (reg === "script") {
				for (const m of l.matchAll(/\b(duration|delay)\s*:\s*(\d+(?:\.\d+)?)\b(?!\s*\*)/g)) {
					const ms = parseFloat(m[2]);
					if (ms <= 1) continue;
					lit(
						"duration",
						`${m[1]}:${m[2]}`,
						rel,
						i + 1,
						TOKEN_MS.has(ms) ? "token" : "off",
						"(js)"
					);
				}
				if (/transition|animation/i.test(l) && /["'`]/.test(l)) {
					for (const t of timeLiterals(l)) {
						if (t.ms <= 1) continue;
						lit("duration", t.raw, rel, i + 1, TOKEN_MS.has(t.ms) ? "token" : "off", "(js string)");
					}
				}
			} else if (reg === "markup" && /style\s*=|style:|transition|animation/i.test(l)) {
				for (const t of timeLiterals(l)) {
					if (t.ms <= 1) continue;
					if (/duration-|delay-/.test(l) && /\[?\d+(ms|s)\]?/.test(l)) continue; // tailwind already counted
					lit("duration", t.raw, rel, i + 1, TOKEN_MS.has(t.ms) ? "token" : "off", "(markup)");
				}
			}
		}
	}
	if (!refs.lit) add("(no literals)");
	const tokenImportLines = [];

	// --- reduced-motion spans ---
	section("A2 reduced-motion spans (<style> @media blocks) and JS references");
	for (const s of spans
		.filter((s) => s.kind !== "hover-gate")
		.sort((a, b) =>
			(a.file + String(a.start).padStart(6, "0")).localeCompare(
				b.file + String(b.start).padStart(6, "0")
			)
		))
		add(`${s.file}:${s.start}-${s.end}: ${s.header} [${s.kind}]`, "span");
	for (const f of files)
		for (let i = 0; i < f.code.length; i++)
			if (f.region[i] !== "style" && REDUCED_REF.test(f.code[i]))
				add(
					`${f.rel}:${i + 1}: ${f.lines[i].trim().slice(0, 140)} [js/markup reduced-motion ref]`,
					"rmref"
				);
	if (!refs.span && !refs.rmref)
		add("(no prefers-reduced-motion block or helper reference in this dir)");

	// --- declarations ---
	section(
		"A2 motion declarations (transition / animation / @keyframes / animate() / svelte directives) and gate state"
	);
	const ungatedTfo = [];
	const layoutAnim = []; // {kind, file,line,evLine, where}
	const filterAnim = [];
	const infiniteKf = new Set();
	for (const d of allDecls) {
		if (/^animation(-name)?$/.test(d.prop) && /\binfinite\b/.test(d.value)) {
			for (const k of Object.keys(keyframes))
				if (new RegExp(`(^|[\\s,])${k}([\\s,;]|$)`).test(d.value)) infiniteKf.add(k);
		}
		if (d.prop === "animation-iteration-count" && /infinite/.test(d.value)) infiniteKf.add("*");
	}
	for (const d of allDecls) {
		if (isKeyframes(d.anc)) continue;
		const g = gateOf(d.anc);
		if (d.prop === "will-change") {
			add(`${d.file}:${d.line}: will-change: ${d.value} [${g}]`, "willchange");
			continue;
		}
		if (/^transition(-property)?$/.test(d.prop)) {
			const segs = d.prop === "transition" ? splitTop(d.value) : splitTop(d.value);
			const kinds = new Set();
			for (const seg of segs) {
				const p = d.prop === "transition" ? seg.split(/\s+/)[0] : seg.trim();
				if (p === "none" || /^\d|^var\(|^cubic|^ease|^linear/.test(p)) {
					if (!/^var\(/.test(p)) continue;
				}
				if (COLOR_PROPS.has(p)) kinds.add("colour");
				else if (TFO_PROPS.has(p) || (/^var\(/.test(p) && /transform|opacity/.test(seg)))
					kinds.add("tfo");
				else if (LAYOUT_RE.test(p)) kinds.add("layout");
				else if (p === "box-shadow" || p === "text-shadow") kinds.add("shadow");
				else if (OTHER_MOTION.test(p)) kinds.add("other");
				else if (/^[a-z-]+$/.test(p)) kinds.add("other:" + p);
			}
			const kindStr = [...kinds].sort().join("+") || "?";
			add(`${d.file}:${d.line}: ${d.prop}: ${d.value.slice(0, 120)} [${g}] [${kindStr}]`, "decl");
			if (kinds.has("tfo") && g === "ungated")
				ungatedTfo.push({
					file: d.file,
					line: d.line,
					ev: ev.length,
					text: `${d.prop}: ${d.value.slice(0, 80)}`,
				});
			if (kinds.has("layout"))
				layoutAnim.push({ file: d.file, line: d.line, ev: ev.length, where: "transition", g });
			if (kinds.has("shadow") || (kinds.has("tfo") && /filter/.test(d.value)))
				filterAnim.push({
					file: d.file,
					line: d.line,
					ev: ev.length,
					where: "transition",
					g,
					p: /filter/.test(d.value) ? "filter" : "box-shadow",
				});
			continue;
		}
		if (/^animation(-name)?$/.test(d.prop)) {
			const names = Object.keys(keyframes).filter((k) =>
				new RegExp(`(^|[\\s,])${k}([\\s,;]|$)`).test(d.value)
			);
			const kinds = new Set();
			for (const n of names)
				for (const p of keyframes[n].props)
					kinds.add(
						TFO_PROPS.has(p)
							? "tfo"
							: LAYOUT_RE.test(p)
								? "layout"
								: p === "box-shadow"
									? "shadow"
									: COLOR_PROPS.has(p)
										? "colour"
										: "other"
					);
			if (d.prop === "animation" && d.value === "none") continue;
			const kindStr = [...kinds].sort().join("+") || (names.length ? "?" : "unresolved-keyframes");
			const inf = /\binfinite\b/.test(d.value) ? " infinite" : "";
			add(
				`${d.file}:${d.line}: ${d.prop}: ${d.value.slice(0, 120)} [${g}] [${kindStr}${inf}]`,
				"decl"
			);
			if (kinds.has("tfo") && g === "ungated")
				ungatedTfo.push({
					file: d.file,
					line: d.line,
					ev: ev.length,
					text: `${d.prop}: ${d.value.slice(0, 80)}`,
				});
			continue;
		}
	}
	for (const k of Object.keys(keyframes).sort()) {
		const kf = keyframes[k];
		const props = [...kf.props].sort();
		const g = (() => {
			// gate of the @keyframes block itself is irrelevant; the animation use is what is gated
			return "";
		})();
		add(
			`${kf.file}:${kf.line}: @keyframes ${k} props=[${props.join(",")}]${infiniteKf.has(k) || infiniteKf.has("*") ? " [used infinite]" : ""}`,
			"kf"
		);
		for (const p of props) {
			if (LAYOUT_RE.test(p))
				layoutAnim.push({
					file: kf.file,
					line: kf.line,
					ev: ev.length,
					where: `@keyframes ${k}`,
					p,
					inf: infiniteKf.has(k),
				});
			if (p === "filter" || p === "box-shadow")
				filterAnim.push({
					file: kf.file,
					line: kf.line,
					ev: ev.length,
					where: `@keyframes ${k}`,
					p,
					inf: infiniteKf.has(k),
				});
		}
	}
	// Tailwind motion classes, svelte directives, animate()
	const directiveLines = []; // {file,line,kind,helper}
	let twUngatedMotion = 0;
	const twUngatedList = [];
	let usesTransitionsHelper = false,
		usesAnchoredHelper = false,
		usesBuiltinTransition = false;
	for (const f of files) {
		const importsAnchored = f.code.some(
			(l, i) => f.region[i] === "script" && /_internals\/motion\/anchored/.test(l)
		);
		const importsTransitions = f.code.some(
			(l, i) => f.region[i] === "script" && /_internals\/motion\/(transitions|presets)/.test(l)
		);
		const importsBuiltin = f.code.some(
			(l, i) => f.region[i] === "script" && /from\s+["']svelte\/transition["']/.test(l)
		);
		if (importsAnchored) usesAnchoredHelper = true;
		if (importsTransitions) usesTransitionsHelper = true;
		const scan = scanMarkup(f, keyframes);
		for (const it of scan.items) {
			add(
				`${f.rel}:${it.line}: inline ${it.kind} ${it.text} [${it.gated ? "gated: " + it.why : "ungated inline"}] [tfo]`,
				"decl"
			);
			if (!it.gated)
				ungatedTfo.push({
					file: f.rel,
					line: it.line,
					ev: ev.length,
					text: `inline ${it.kind} ${it.text}`,
					inline: true,
				});
		}
		for (let i = 0; i < f.code.length; i++) {
			const l = scan.masked[i];
			const reg = f.region[i];
			if (reg === "markup") {
				for (const m of l.matchAll(
					/(?<![\w-])((?:[a-z-]+:)*)(transition(?:-[a-z]+)?|animate-[\w\[\]\-.,()%/]+)(?![\w:-])/g
				)) {
					const prefix = m[1] || "";
					const name = m[2];
					if (/^transition-(colors?)$/.test(name)) {
						add(`${f.rel}:${i + 1}: tailwind ${m[0]} [colour-only, ignored]`);
						continue;
					}
					if (/^transition-(none|\w*)$/.test(name) && /none/.test(name)) continue;
					const gated =
						/motion-safe:/.test(prefix) ||
						/motion-reduce:[^\s"']*(transition-none|animate-none)/.test(l);
					add(`${f.rel}:${i + 1}: tailwind ${m[0]} [${gated ? "gated" : "ungated"}]`, "tw");
					if (!gated) {
						twUngatedMotion++;
						twUngatedList.push(`${f.rel}:${i + 1} ${m[0]}`);
					}
				}
				for (const m of l.matchAll(/(?<![\w-])(transition|in|out|animate|use):([\w.$]+)/g)) {
					if (m[1] === "use") continue;
					if (!/[\s{<]|^/.test(l)) continue;
					directiveLines.push({
						file: f.rel,
						line: i + 1,
						kind: m[1],
						fn: m[2],
						branchGated: scan.branchLine[i],
					});
				}
			}
			if (
				(reg === "script" &&
					/(^|[^\w$])(\w+\.)?animate\(/.test(l) &&
					!/\.animate\(\s*\)/.test(l) &&
					!/function\s+animate\(|const animate\b|animate\s*=/.test(l)) ||
				(reg === "script" && /\.animate\(/.test(l))
			)
				add(`${f.rel}:${i + 1}: ${l.trim().slice(0, 140)} [animate() call]`, "animatecall");
			if (reg === "script" && /\banimate\(/.test(l) && /(import|from)/.test(l))
				add(`${f.rel}:${i + 1}: ${l.trim().slice(0, 140)} [animate import]`);
		}
		if (importsBuiltin) usesBuiltinTransition = true;
	}
	for (const d of directiveLines) {
		const f = fileByRel[d.file];
		const fn = d.fn.split(".")[0];
		// where does fn come from?
		const importLine = f.code.find(
			(l, i) =>
				f.region[i] === "script" && new RegExp(`\\b${fn}\\b`).test(l) && /import|from/.test(l)
		);
		const fileHasRm = f.code.some((l, i) => f.region[i] !== "style" && REDUCED_REF.test(l));
		const src = /anchored/.test(importLine ?? "")
			? "anchored.ts (self-gates via prefersReducedMotion)"
			: /_internals\/motion\/(transitions|presets)/.test(importLine ?? "")
				? "transitions.ts/presets.ts (no self-gate; consumer must zero duration)"
				: /svelte\/(transition|animate)/.test(importLine ?? "")
					? "svelte built-in (no self-gate)"
					: importLine
						? "local/imported fn"
						: "unresolved import";
		add(
			`${d.file}:${d.line}: ${d.kind}:${d.fn} [${src}]${fileHasRm ? " [file references reduced-motion]" : ""}`,
			"decl"
		);
		directiveLines[directiveLines.indexOf(d)] = {
			...d,
			src,
			fileHasRm: fileHasRm || d.branchGated,
		};
	}

	// --- imports from _internals/motion ---
	section(
		"imports from _internals/motion (anchored/transitions/presets/tokens/media-query/in-view/raf/stagger/haptics)"
	);
	const motionImports = new Set();
	for (const f of files)
		for (let i = 0; i < f.code.length; i++) {
			const m = f.code[i].match(/_internals\/motion\/([\w.-]+)/);
			if (m && f.region[i] !== "style") {
				add(`${f.rel}:${i + 1}: ${f.lines[i].trim().slice(0, 140)}`, "imp");
				motionImports.add(m[1].replace(/\.(js|ts)$/, ""));
			}
		}
	if (!refs.imp) add("(none)");
	const usesInViewHelper = motionImports.has("in-view");

	// --- rAF / observers / teardown ---
	section("rAF loops, IntersectionObserver / visibility pause, teardown");
	const flags = {
		raf: 0,
		rafLoop: 0,
		caf: 0,
		io: 0,
		ioDisconnect: 0,
		vis: 0,
		ro: 0,
		roDisconnect: 0,
		interval: 0,
		clearInterval: 0,
		addL: 0,
		removeL: 0,
		abortSignal: 0,
		dispose: 0,
		timeout: 0,
	};
	const rafLines = [];
	const addListenerLines = [];
	for (const f of files) {
		const text = f.code.join("\n");
		for (let i = 0; i < f.code.length; i++) {
			const l = f.code[i];
			if (f.region[i] === "style") continue;
			const ln = `${f.rel}:${i + 1}`;
			const snip = f.lines[i].trim().slice(0, 140);
			if (/requestAnimationFrame\s*\(/.test(l)) {
				flags.raf++;
				const m = l.match(/requestAnimationFrame\(\s*(\w+)\s*\)/);
				let loop = false;
				if (m) loop = new RegExp(`(function\\s+${m[1]}\\b|(const|let)\\s+${m[1]}\\s*=)`).test(text);
				if (loop) flags.rafLoop++;
				rafLines.push({ ln, loop });
				add(
					`${ln}: ${snip} [requestAnimationFrame${loop ? ", self-rescheduling loop" : ""}]`,
					"raf"
				);
			}
			if (/rafThrottle|createRaf|motion\/raf/.test(l))
				add(`${ln}: ${snip} [raf helper from _internals/motion]`, "raf");
			if (/cancelAnimationFrame\s*\(/.test(l)) {
				flags.caf++;
				add(`${ln}: ${snip} [cancelAnimationFrame]`, "teardown");
			}
			if (/new\s+IntersectionObserver/.test(l)) {
				flags.io++;
				add(`${ln}: ${snip} [IntersectionObserver]`, "io");
			}
			if (/inView\b|createInView|motion\/in-view/.test(l) && !/^\s*\*/.test(l)) {
				flags.io++;
				add(`${ln}: ${snip} [in-view helper (IntersectionObserver)]`, "io");
			}
			if (/\.disconnect\s*\(/.test(l)) {
				flags.ioDisconnect++;
				add(`${ln}: ${snip} [disconnect]`, "teardown");
			}
			if (/visibilitychange|document\.hidden|visibilityState/.test(l)) {
				flags.vis++;
				add(`${ln}: ${snip} [visibility check]`, "io");
			}
			if (/new\s+ResizeObserver/.test(l)) {
				flags.ro++;
				add(`${ln}: ${snip} [ResizeObserver]`, "io");
			}
			if (/setInterval\s*\(/.test(l)) {
				flags.interval++;
				add(`${ln}: ${snip} [setInterval]`, "raf");
			}
			if (/clearInterval\s*\(/.test(l)) {
				flags.clearInterval++;
				add(`${ln}: ${snip} [clearInterval]`, "teardown");
			}
			if (/removeEventListener\s*\(/.test(l)) {
				flags.removeL++;
				add(`${ln}: ${snip} [removeEventListener]`, "teardown");
			}
			if (/addEventListener\s*\(/.test(l)) {
				flags.addL++;
				addListenerLines.push(ln);
			}
			if (/signal\s*:\s*\w|AbortController/.test(l)) {
				flags.abortSignal++;
				add(`${ln}: ${snip} [AbortController/signal]`, "teardown");
			}
			if (
				/dispose\s*\(|\.destroy\s*\(|onDestroy|return\s*\(\)\s*=>|return\s*function|\.loseContext\s*\(/.test(
					l
				)
			) {
				flags.dispose++;
				add(`${ln}: ${snip} [dispose/destroy/cleanup]`, "teardown");
			}
		}
	}
	if (!refs.raf && !refs.io && !refs.teardown) add("(none)");

	// --- will-change ---
	section("will-change");
	for (const f of files)
		for (let i = 0; i < f.code.length; i++)
			if (f.region[i] !== "style" && /will-change|willChange/.test(f.code[i]))
				add(
					`${f.rel}:${i + 1}: ${f.lines[i].trim().slice(0, 140)} [will-change in markup/script]`,
					"willchange"
				);
	if (!refs.willchange) add("(none)");

	// --- animated layout/filter/box-shadow ---
	section(
		"animated layout / filter / box-shadow properties (transition lists and @keyframes bodies)"
	);
	for (const a of layoutAnim)
		add(
			`${a.file}:${a.line}: layout property animated in ${a.where}${a.p ? " (" + a.p + ")" : ""}${a.inf ? " [infinite]" : ""}`,
			"layout"
		);
	for (const a of filterAnim)
		add(
			`${a.file}:${a.line}: ${a.p} animated in ${a.where}${a.inf ? " [infinite]" : ""}`,
			"filter"
		);
	if (!refs.layout && !refs.filter) add("(none)");

	// --- other ---
	section("$app/* imports, sound, canvas/GPU contexts, pointer/scroll listeners");
	let sound = false;
	const render = new Set(["dom"]);
	const listeners = { pointer: 0, scroll: 0 };
	for (const f of files)
		for (let i = 0; i < f.code.length; i++) {
			const l = f.code[i];
			if (f.region[i] === "style") continue;
			const ln = `${f.rel}:${i + 1}`;
			const snip = f.lines[i].trim().slice(0, 140);
			if (/from\s+["']\$app\//.test(l)) add(`${ln}: ${snip} [$app import]`, "other");
			if (
				/from\s+["'][^"']*sound\/(sound|sound-feedback)[^"']*["']/.test(l) ||
				/from\s+["']\.\.?\/sound-feedback/.test(l)
			) {
				if (slug !== "sound") sound = true;
				add(`${ln}: ${snip} [sound]`, "other");
			}
			const gc = l.match(
				/getContext\(\s*["'`](webgl2?|experimental-webgl|2d|webgpu|bitmaprenderer)["'`]/
			);
			if (gc) {
				add(`${ln}: ${snip} [getContext ${gc[1]}]`, "other");
				render.add(
					gc[1] === "2d"
						? "canvas2d"
						: gc[1] === "webgpu"
							? "webgpu"
							: gc[1] === "bitmaprenderer"
								? "canvas2d"
								: "webgl"
				);
			}
			if (/navigator\.gpu|requestAdapter\(/.test(l)) {
				render.add("webgpu");
				add(`${ln}: ${snip} [WebGPU]`, "other");
			}
			if (/from\s+["'](three|ogl|regl|pixi\.js|@pixi\/[\w-]+)["']/.test(l)) {
				render.add("webgl");
				add(`${ln}: ${snip} [webgl lib import]`, "other");
			}
			if (/<svg\b/.test(l) || /createElementNS/.test(l)) render.add("svg");
			if (/<canvas\b/.test(l)) render.add("canvas2d_candidate");
			if (
				/(pointermove|mousemove|touchmove|pointerenter|mouseenter|onpointer\w+|onmouse\w+)/.test(
					l
				) &&
				/(addEventListener|on(pointer|mouse)\w+|svelte:window|svelte:document|svelte:body)/.test(l)
			) {
				listeners.pointer++;
				add(`${ln}: ${snip} [pointer/mouse listener]`, "other");
			}
			if (
				/(["'`]scroll["'`]|onscroll|scrollY|scrollTop|scrollYProgress)/.test(l) &&
				/(addEventListener|onscroll|svelte:window|scrollY|scrollTop)/.test(l)
			) {
				listeners.scroll++;
				add(`${ln}: ${snip} [scroll listener/read]`, "other");
			}
		}
	if (
		render.has("canvas2d_candidate") &&
		!render.has("canvas2d") &&
		!render.has("webgl") &&
		!render.has("webgpu")
	)
		render.add("canvas2d");
	render.delete("canvas2d_candidate");
	if (!refs.other) add("(none)");
	// svg is only recorded in schema enum as "svg": keep as-is

	// ---------- classification ----------
	const rubricSignal = files.some((f) =>
		f.code.some((l, i) =>
			f.region[i] !== "style"
				? /transition:|animation:|animate\(/.test(l)
				: /transition:|animation:|@keyframes/.test(l)
		)
	);
	const anyMotionSignal =
		rubricSignal ||
		flags.raf > 0 ||
		flags.interval > 0 ||
		render.has("webgl") ||
		render.has("webgpu") ||
		render.has("canvas2d") ||
		directiveLines.length > 0 ||
		refs.tw ||
		motionImports.size > 0 ||
		Object.keys(keyframes).length > 0 ||
		refs.animatecall;
	const isStatic = !anyMotionSignal;

	// ---------- A2 static ----------
	let a2 = { score: null, note: "" };
	let r9Applied = false,
		r9Proven = true;
	const a2Evidence = [];
	const evRef = (n) => `components/${slug}/evidence/static.txt#L${n}`;
	// R9 (rubric ruling): a blanket reduce override neutralising the dir's motion is functionally equivalent to gating.
	// Neutralising declaration inside @media (prefers-reduced-motion: reduce): animation/transition none|paused, <=100ms duration,
	// animation-play-state paused, transform none, or a transition reduced to opacity/colour only.
	const reduceDecls = allDecls.filter((d) => gateOf(d.anc) === "reduce" && !isKeyframes(d.anc));
	const msOf = (v) => {
		const m = v.match(/^(\d*\.?\d+)(ms|s)\b/);
		return m ? parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1) : null;
	};
	const neutralising = (d) => {
		const v = d.value.replace(/\s*!important\s*$/, "").trim();
		if (/^(animation|animation-name|transition|transition-property)$/.test(d.prop) && v === "none")
			return true;
		if (d.prop === "animation-play-state" && /paused/.test(v)) return true;
		if (/^(animation-duration|transition-duration)$/.test(d.prop)) {
			const ms = msOf(v);
			return ms !== null && ms <= 100;
		}
		if (d.prop === "transform" && v === "none") return true;
		if (d.prop === "transition") {
			const props = splitTop(v).map((x) => x.split(/\s+/)[0]);
			return (
				props.length > 0 &&
				props.every((p) => p === "none" || p === "opacity" || COLOR_PROPS.has(p))
			);
		}
		return false;
	};
	const overrideDecls = reduceDecls.filter(neutralising);
	const reduceOverride = spans.some((s) => s.kind === "reduce") && overrideDecls.length > 0;
	const reduceImportant = overrideDecls.some((d) => /!important/.test(d.value));
	const overrideSelectors = overrideDecls.map((d) => d.anc[d.anc.length - 1]).join(" ");
	const reduceClasses = new Set(overrideSelectors.match(/\.[\w-]+/g) ?? []);
	const anyRm = refs.span || refs.rmref;
	const jsMotion = flags.raf > 0 || flags.interval > 0 || refs.animatecall;
	const fileHasRmAny = files.some((f) =>
		f.code.some((l, i) => f.region[i] !== "style" && REDUCED_REF.test(l))
	);
	const directiveUngated = directiveLines.filter(
		(d) => d.src && !/anchored/.test(d.src) && !d.fileHasRm
	);
	if (isStatic) {
		a2 = { score: null, note: "static" };
	} else if (ungatedTfo.length || twUngatedMotion) {
		const first = ungatedTfo[0];
		const inlineUncovered = ungatedTfo.filter((u) => u.inline).length > 0 && !reduceImportant;
		if (reduceOverride && !inlineUncovered) {
			const cssSel = allDecls
				.filter(
					(d) =>
						!isKeyframes(d.anc) &&
						gateOf(d.anc) === "ungated" &&
						/^(animation|transition)/.test(d.prop)
				)
				.map((d) => d.anc[d.anc.length - 1] ?? "");
			const proven =
				cssSel.length > 0 &&
				cssSel.every((sel) => (sel.match(/\.[\w-]+/g) ?? []).some((c) => reduceClasses.has(c)));
			a2 = {
				score: 3,
				note: `R9: blanket reduce override (${overrideDecls.length} neutralising decl in @media reduce) covers the dir's ungated transform/opacity/filter motion (${ungatedTfo.length} css decl, ${twUngatedMotion} tailwind); functionally equivalent to gating${proven ? "" : "; selector coverage not fully proven (heuristic)"}`,
			};
			r9Applied = true;
			r9Proven = proven;
		} else if (ungatedTfo.length) {
			a2 = {
				score: 0,
				note: `ungated transform/opacity/filter motion declared in-dir: ${first.file}:${first.line} \`${first.text}\`; no reduce override block`,
			};
		} else {
			a2 = {
				score: fileHasRmAny ? 1 : 0,
				note:
					`${twUngatedMotion} tailwind transition/animate class(es) without motion-safe:/motion-reduce: pairing` +
					(fileHasRmAny
						? "; file has some reduced-motion helper (partial)"
						: "; no reduced-motion helper"),
			};
		}
		for (const u of ungatedTfo) a2Evidence.push(evRef(u.ev));
		for (const n of refs.tw ?? []) if (/ungated/.test(ev[n - 1])) a2Evidence.push(evRef(n));
	} else if (directiveUngated.length) {
		a2 = {
			score: 1,
			note: `uses ${[...new Set(directiveUngated.map((d) => d.src))].join(" / ")} directive(s) with no reduced-motion reference in the file (cannot prove duration is zeroed; inherited, not declared in-dir)`,
		};
		for (const n of refs.decl ?? []) a2Evidence.push(evRef(n));
	} else if (jsMotion && !fileHasRmAny && !reduceOverride) {
		a2 = {
			score: 1,
			note: `JS-driven motion (rAF/setInterval/animate()) with no reduced-motion reference (createReducedMotion/prefersReducedMotion/matchMedia) anywhere in dir`,
		};
		for (const n of [...(refs.raf ?? []), ...(refs.animatecall ?? [])]) a2Evidence.push(evRef(n));
	} else if (
		(render.has("webgl") || render.has("webgpu") || render.has("canvas2d")) &&
		flags.raf === 0 &&
		!fileHasRmAny &&
		!refs.decl
	) {
		a2 = {
			score: null,
			note: "static-half-uncertain: canvas/GPU render with no CSS motion and no reduced-motion reference; motion lives in helper/core modules outside this dir or is event-driven",
		};
	} else if (jsMotion && refs.span && !fileHasRmAny) {
		a2 = {
			score: 2,
			note: "CSS motion gated by no-preference block; JS motion (rAF/animate()) has no reduced-motion reference",
		};
		for (const n of [...(refs.raf ?? []), ...(refs.animatecall ?? []), ...(refs.span ?? [])])
			a2Evidence.push(evRef(n));
	} else {
		a2 = {
			score: 3,
			note:
				"motion present; every transform/opacity/filter motion is gated, helper-inherited or JS-guarded" +
				(usesAnchoredHelper ? " (anchored.ts self-gates)" : ""),
		};
		for (const n of [...(refs.span ?? []), ...(refs.rmref ?? [])].slice(0, 6))
			a2Evidence.push(evRef(n));
	}
	if (
		a2.score === 3 &&
		!anyRm &&
		!usesAnchoredHelper &&
		!directiveLines.length &&
		(refs.decl ?? []).some((n) => /tfo/.test(ev[n - 1]) && /ungated/.test(ev[n - 1]))
	)
		a2 = { score: 0, note: "internal consistency" };

	// ---------- A1 ----------
	const nCurve = offTokens.filter((o) => o.kind === "curve").length;
	const nDur = offTokens.filter((o) => o.kind === "duration").length;
	const nOff = offTokens.length;
	let a1;
	const a1Evidence = offTokens.slice(0, 8).map((o) => evRef(o.evLine));
	if (nOff === 0) {
		const total = onTokenCount.curves + onTokenCount.durations;
		a1 = {
			score: 3,
			note: total ? `${total} literals, all on-token or justified` : "no timing literals in dir",
		};
		if (!a1Evidence.length && refs.lit) a1Evidence.push(evRef(refs.lit[0]));
	} else {
		a1 = {
			score: nOff <= 2 ? 2 : nOff <= 5 ? 1 : 0,
			note: `${nOff} uncommented off-token literal(s): ${nCurve} curve, ${nDur} duration — ${[...new Set(offTokens.map((o) => o.raw))].slice(0, 6).join(", ")}`,
		};
	}
	// no timing at all and static → null? keep 3 (nothing off-token); static dirs get 3 with note.

	// ---------- A4 static findings ----------
	const findings = [];
	let seq = 0;
	const fid = () => `${slug}-${String(++seq).padStart(2, "0")}`;
	const pushF = (priority, title, detail, evidence, cmd, benefit) => {
		if (seq >= 19) return;
		findings.push({
			id: fid(),
			axis: "A4",
			priority,
			title,
			detail,
			evidence,
			verification: "grep",
			verification_cmd: cmd,
			expected_benefit: benefit,
			frameworks: ["svelte"],
			status: "open",
		});
	};
	const g = GREP_FILES(slug);
	const rafUnstopped = flags.raf > 0 && flags.io === 0;
	if (flags.raf > 0 && flags.io === 0 && flags.vis === 0) {
		const loopy = flags.rafLoop > 0;
		pushF(
			loopy ? "P1" : "P2",
			`requestAnimationFrame ${loopy ? "loop" : "usage"} with no offscreen or hidden-tab pause`,
			`${flags.raf} requestAnimationFrame call(s)${loopy ? `, ${flags.rafLoop} self-rescheduling` : ""}; no IntersectionObserver / in-view helper / visibilitychange anywhere in the dir. Loop keeps running while scrolled out of view.${loopy ? "" : " (not proven to be a continuous loop; verify)"}`,
			(refs.raf ?? []).slice(0, 4).map(evRef),
			`grep -nE 'requestAnimationFrame|IntersectionObserver|visibilitychange|in-view' ${g}`,
			"Idle CPU/battery drop for offscreen instances; pause on IO exit."
		);
	} else if (flags.raf > 0 && flags.io === 0 && flags.vis > 0) {
		pushF(
			"P2",
			"rAF loop pauses on tab hidden but not when scrolled offscreen",
			"visibilitychange/document.hidden is checked but no IntersectionObserver / in-view helper gates the loop.",
			[...(refs.raf ?? []).slice(0, 2), ...(refs.io ?? []).slice(0, 2)].map(evRef),
			`grep -nE 'requestAnimationFrame|visibilitychange|document\\.hidden|IntersectionObserver' ${g}`,
			"Offscreen instances stop consuming frames."
		);
	}
	if (flags.raf > 0 && flags.caf === 0) {
		pushF(
			"P1",
			"requestAnimationFrame without any cancelAnimationFrame (missing teardown)",
			`${flags.raf} rAF call(s), 0 cancelAnimationFrame in the dir. Pending frame / loop survives destroy unless a helper cancels it.`,
			(refs.raf ?? []).slice(0, 4).map(evRef),
			`grep -nE 'requestAnimationFrame|cancelAnimationFrame' ${g}`,
			"No retained rAF callbacks after unmount (lifecycle leak check)."
		);
	}
	if (flags.io > 0 && flags.ioDisconnect === 0 && !usesInViewHelper) {
		pushF(
			"P2",
			"IntersectionObserver without a disconnect() in the dir",
			"`new IntersectionObserver` present, no `.disconnect()`; observer may outlive the component.",
			(refs.io ?? []).slice(0, 3).map(evRef),
			`grep -nE 'new IntersectionObserver|\\.disconnect\\(' ${g}`,
			"Observer released on destroy."
		);
	}
	if (flags.ro > 0 && flags.ioDisconnect === 0) {
		pushF(
			"P2",
			"ResizeObserver without a disconnect() in the dir",
			"`new ResizeObserver` present, no `.disconnect()`.",
			(refs.io ?? []).slice(0, 3).map(evRef),
			`grep -nE 'new ResizeObserver|\\.disconnect\\(' ${g}`,
			"Observer released on destroy."
		);
	}
	if (flags.interval > 0 && flags.clearInterval === 0) {
		pushF(
			"P1",
			"setInterval without clearInterval (missing teardown)",
			`${flags.interval} setInterval call(s), 0 clearInterval in the dir.`,
			(refs.raf ?? [])
				.filter((n) => /setInterval/.test(ev[n - 1]))
				.slice(0, 3)
				.map(evRef),
			`grep -nE 'setInterval|clearInterval' ${g}`,
			"Timer stops on destroy."
		);
	}
	if (flags.addL > flags.removeL && flags.abortSignal === 0 && flags.addL > 0) {
		pushF(
			"P2",
			`addEventListener (${flags.addL}) outnumbers removeEventListener (${flags.removeL}) with no AbortController signal`,
			"Imbalance is a heuristic: listeners may be removed through a helper or attached to the component's own node (auto-collected).",
			addListenerLines
				.slice(0, 3)
				.map((x) => x)
				.concat(refs.teardown ? [evRef(refs.teardown[0])] : [])
				.map((x) => (x.startsWith("components/") ? x : x.replace(/:(\d+)$/, ":L$1"))),
			`grep -nE 'addEventListener|removeEventListener|signal' ${g}`,
			"Zero retained window/document listeners after 50 mount cycles."
		);
	}
	if (refs.willchange) {
		pushF(
			"P2",
			"will-change declared (permanent compositor layer)",
			`${refs.willchange.length} will-change declaration(s); static will-change keeps a layer alive for the element's whole lifetime.`,
			refs.willchange.slice(0, 3).map(evRef),
			`grep -nE 'will-change|willChange' ${g}`,
			"Fewer promoted layers; toggle only during motion."
		);
	}
	const layoutKf = layoutAnim.filter((a) => /@keyframes/.test(a.where));
	const layoutTr = layoutAnim.filter((a) => a.where === "transition");
	if (layoutKf.length) {
		const inf = layoutKf.filter((a) => a.inf);
		pushF(
			inf.length ? "P1" : "P2",
			`layout property animated in @keyframes (${[...new Set(layoutKf.map((a) => a.p))].join(", ")})${inf.length ? ", infinite" : ""}`,
			"Animating layout properties triggers layout per frame; transform-based equivalents avoid it.",
			layoutKf.slice(0, 3).map((a) => evRef(a.ev)),
			`grep -nE '@keyframes|width|height|top|left|margin|padding' ${g}`,
			"Compositor-only animation."
		);
	}
	if (layoutTr.length) {
		pushF(
			"P2",
			"layout property listed in a CSS transition (width/height/top/left/margin/padding/…)",
			"Transition on a layout property triggers layout on every frame of the transition.",
			layoutTr.slice(0, 3).map((a) => evRef(a.ev)),
			`grep -nE 'transition[^;]*(width|height|top|left|right|bottom|margin|padding|inset|grid-template)' ${g}`,
			"Cheaper transitions; consider transform/clip-path or grid-rows technique."
		);
	}
	if (filterAnim.length) {
		const infF = filterAnim.filter((a) => a.inf);
		pushF(
			infF.length ? "P1" : "P2",
			`animated ${[...new Set(filterAnim.map((a) => a.p))].join(" / ")} ${infF.length ? "in an infinite @keyframes" : "(transition or finite keyframes)"}`,
			"Animated filter/box-shadow repaints per frame; blur and large shadows are the costliest.",
			filterAnim.slice(0, 3).map((a) => evRef(a.ev)),
			`grep -nE 'filter|box-shadow' ${g}`,
			"Lower paint cost; pre-render glow layer and animate opacity/transform instead."
		);
	}

	// ---------- fields ----------
	const infiniteAny =
		infiniteKf.size > 0 ||
		[...allDecls].some((d) => /^animation/.test(d.prop) && /infinite/.test(d.value));
	const hasPointer = listeners.pointer > 0;
	const hasScroll = listeners.scroll > 0 || usesInViewHelper || flags.io > 0;
	const hasAmbient =
		infiniteAny ||
		flags.rafLoop > 0 ||
		flags.interval > 0 ||
		render.has("webgl") ||
		render.has("webgpu");
	const hasEnter = directiveLines.length > 0 || usesAnchoredHelper || usesTransitionsHelper;
	let motion_class;
	if (isStatic) motion_class = "static";
	else {
		const cls = [hasPointer && "pointer", hasScroll && "scroll", hasAmbient && "ambient"].filter(
			Boolean
		);
		if (cls.length >= 2) motion_class = "mixed";
		else if (cls.length === 1) motion_class = cls[0];
		else if (hasEnter) motion_class = "enter";
		else motion_class = "micro";
	}
	const renderArr = ["dom", "svg", "canvas2d", "webgl", "webgpu"].filter(
		(x) => render.has(x) && (x !== "svg" || render.size > 0)
	);
	const renderOut = renderArr.filter((x) => (x !== "svg" || renderArr.length === 1 ? true : false));
	// keep svg only if nothing else besides dom (avoids noise on gpu/canvas slugs)
	const renderFinal =
		renderArr.includes("svg") && renderArr.length > 2
			? renderArr.filter((x) => x !== "svg")
			: renderArr;

	const ungatedBlock = ungatedTfo
		.map((u) => `${u.file}:${u.line} ${u.text}`)
		.concat(twUngatedList.map((t) => `tailwind ${t}`));
	const partial = {
		slug,
		agent: "S1",
		axes: {
			A1: { score: a1.score, evidence: [...new Set(a1Evidence)].slice(0, 8), note: a1.note },
			A2:
				a2.score === null
					? {
							score: null,
							na_reason: isStatic ? "static" : "static-half-uncertain",
							evidence: [],
							note: a2.note,
						}
					: {
							score: a2.score,
							evidence: [...new Set(a2Evidence)].slice(0, 8),
							note: `STATIC half only. ${a2.note}`,
						},
		},
		fields: { motion_class, render: renderFinal, sound, capturable: undefined },
		findings,
		uncertain_flags: [],
	};
	delete partial.fields.capturable; // S1 does not assign capturable
	if (a2.score === null && !isStatic)
		partial.uncertain_flags.push(`A2 static half cannot be scored from this dir: ${a2.note}`);
	if (r9Applied && !r9Proven)
		partial.uncertain_flags.push(
			"A2=3 via R9 blanket reduce override; selector coverage of the override vs every ungated rule not proven statically; confirm with the dynamic rm pass"
		);
	if (a2.score === 1 && directiveUngated.length)
		partial.uncertain_flags.push(
			"A2=1 relies on consumer zeroing duration for transitions.ts/svelte built-in directives; confirm dynamically (S-dynamic capture rm pass)"
		);
	if (flags.raf > 0 && flags.rafLoop === 0)
		partial.uncertain_flags.push("rAF usage not proven to be a self-rescheduling loop (heuristic)");
	partial.__stats = {
		isStatic,
		a1: a1.score,
		a2: a2.score,
		offTokens,
		ungatedBlock,
		motionImports: [...motionImports],
		reactMissing: react.length === 0,
		vueMissing: vue.length === 0,
		rubricSignal,
		nFindings: findings.length,
		rafUnstopped,
		flags,
	};
	ev.push("");
	ev.push(`## summary`);
	ev.push(
		`motion_class=${motion_class} render=${renderFinal.join("+")} sound=${sound} A1=${a1.score} A2(static)=${a2.score === null ? "null(" + a2.note.slice(0, 30) + ")" : a2.score}`
	);
	return { ev, partial };
}

// ---------- run ----------
function run({ items, out, only }) {
	const stats = [];
	const written = [];
	for (const item of items) {
		if (only && !only.has(item.slug)) continue;
		const { ev, partial } = analyse(item);
		const stat = partial.__stats;
		delete partial.__stats;
		const dir = path.join(out, "components", item.slug);
		fs.mkdirSync(path.join(dir, "evidence"), { recursive: true });
		// write only when content differs (idempotent re-run = 0 writes, mtimes untouched)
		const evTxt = ev.join("\n") + "\n";
		const pJson = JSON.stringify(partial, null, 2) + "\n";
		const wr = (f, c) => {
			if (!fs.existsSync(f) || fs.readFileSync(f, "utf8") !== c) {
				fs.writeFileSync(f, c);
				return true;
			}
			return false;
		};
		const w1 = wr(path.join(dir, "evidence", "static.txt"), evTxt);
		const w2 = wr(path.join(dir, "partial-S1.json"), pJson);
		if (w1 || w2) written.push(item.slug);
		stats.push({ slug: item.slug, ...stat });
	}
	return { stats, written };
}

/** Census report (markdown) over every analysed slug. */
export function censusMarkdown(stats) {
	const dist = (k) => {
		const d = {};
		for (const s of stats) d[String(s[k])] = (d[String(s[k])] ?? 0) + 1;
		return d;
	};
	const lits = {};
	for (const s of stats)
		for (const o of s.offTokens) {
			const k = `${o.kind} ${o.raw}`;
			(lits[k] ??= { n: 0, slugs: new Set() }).n++;
			lits[k].slugs.add(s.slug);
		}
	const topLits = Object.entries(lits)
		.sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1))
		.slice(0, 25);
	const a2zero = stats.filter((s) => s.a2 === 0);
	const lines = [];
	lines.push("# Static census (generated by scripts/audit/static.mjs; deterministic)", "");
	lines.push(`slugs analysed: ${stats.length}`);
	lines.push(
		`static dirs (A2 null, na_reason static): ${stats.filter((s) => s.isStatic).length}  (the plain regex \`transition:|animation:|@keyframes|animate(\` matches ${stats.filter((s) => s.rubricSignal).length} dirs on non-test source)`
	);
	lines.push(
		`react mirror missing: ${
			stats
				.filter((s) => s.reactMissing)
				.map((s) => s.slug)
				.join(", ") || "none"
		}`
	);
	lines.push(
		`vue mirror missing: ${
			stats
				.filter((s) => s.vueMissing)
				.map((s) => s.slug)
				.join(", ") || "none"
		}`,
		""
	);
	lines.push(
		"## A1 score distribution (3 = 0 off-token, 2 = 1-2, 1 = 3-5, 0 = 6+)",
		"```",
		JSON.stringify(dist("a1")),
		"```",
		""
	);
	lines.push(
		"## A2 static score distribution (null = static or static-half-uncertain)",
		"```",
		JSON.stringify(dist("a2")),
		"```",
		""
	);
	lines.push(
		"## Top off-token literals (uncommented)",
		"",
		"| literal | occurrences | dirs |",
		"|---|---|---|"
	);
	for (const [k, v] of topLits) lines.push(`| \`${k}\` | ${v.n} | ${v.slugs.size} |`);
	lines.push("", "## Dirs scoring A2 = 0 with the ungated declaration", "");
	if (!a2zero.length) lines.push("(none)");
	for (const s of a2zero)
		lines.push(
			`- ${s.slug}: ${s.ungatedBlock.slice(0, 3).join(" | ") || "tailwind class ungated (see evidence)"}${s.ungatedBlock.length > 3 ? ` (+${s.ungatedBlock.length - 3} more)` : ""}`
		);
	const a2null = stats.filter((s) => s.a2 === null && !s.isStatic);
	lines.push("", "## Dirs with A2 static = null but NOT static (uncertain)", "");
	for (const s of a2null) lines.push(`- ${s.slug}`);
	if (!a2null.length) lines.push("(none)");
	const a2one = stats.filter((s) => s.a2 === 1);
	lines.push(
		"",
		`## Dirs scoring A2 = 1 (${a2one.length})`,
		"",
		a2one.map((s) => s.slug).join(", ") || "(none)"
	);
	const totF = stats.reduce((a, s) => a + s.nFindings, 0);
	lines.push(
		"",
		`## A4 static findings: ${totF} total across ${stats.filter((s) => s.nFindings).length} dirs`
	);
	return lines.join("\n") + "\n";
}

export function selfTest() {
	const fail = (m) => {
		console.error(`static self-test FAILED: ${m}`);
		process.exit(1);
	};
	const eq = (a, b, m) => {
		if (JSON.stringify(a) !== JSON.stringify(b))
			fail(`${m}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
	};
	configure("", 'export const E = { out: "cubic-bezier(0.16, 1, 0.3, 1)" };');
	eq(normCurve(" 0.16, 1, .3 ,1"), "0.16,1,0.3,1", "normCurve");
	eq(
		splitTop("opacity 150ms cubic-bezier(0.1, 0.2, 0.3, 0.4), color 1s"),
		["opacity 150ms cubic-bezier(0.1, 0.2, 0.3, 0.4)", "color 1s"],
		"splitTop"
	);
	eq(
		timeLiterals("a .3s b 120ms var(--d-150ms)").map((t) => t.ms),
		[300, 120],
		"timeLiterals"
	);
	const svelte = [
		'<div style="animation: spin 2s linear infinite"></div>',
		"<style>",
		"@media (prefers-reduced-motion: no-preference) {",
		"  .a { transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1); }",
		"}",
		"@media (prefers-reduced-motion: reduce) {",
		"  .b { animation: none; }",
		"}",
		".c { transition: opacity 333ms ease; }",
		"</style>",
	].join("\n");
	const f = loadFileText("/x/A.svelte", svelte);
	eq(f.region.slice(0, 2), ["markup", "style"], "regions");
	const css = parseCss(f);
	eq(
		css.spans.map((s) => s.kind),
		["no-preference", "reduce"],
		"media spans"
	);
	const c = css.decls.find((d) => d.prop === "transition" && d.value.startsWith("opacity"));
	eq(c && gateOf(c.anc), "ungated", "ungated decl");
	const a = css.decls.find((d) => d.value.includes("transform"));
	eq(a && gateOf(a.anc), "gated", "gated decl");
	const scan = scanMarkup(f, css.keyframes);
	eq(scan.items.length, 1, "inline style motion found");
	eq(scan.items[0].gated, false, "inline style motion is ungated");
	console.log("static self-test ok");
}

function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test", "census"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	configure(paths.repo);
	const only = parseList(opts.only);
	const items = loadInventory(paths.inventory);
	const { stats, written } = run({ items, out: paths.out, only });
	if (!only) {
		fs.mkdirSync(path.join(paths.out, "logs"), { recursive: true });
		fs.writeFileSync(path.join(paths.out, "logs", "S1b-census.md"), censusMarkdown(stats));
	}
	console.log(
		`static: ${stats.length} slugs; rewritten: ${written.length}${written.length && written.length <= 10 ? " (" + written.join(",") + ")" : ""}`
	);
}

if (isMain(process.argv[1], import.meta.url)) main();
