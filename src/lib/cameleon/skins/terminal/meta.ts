import type { SkinMeta } from "../../types.js";

/** Terminal design metadata — CRT green-on-black, monospace everywhere. */
export const terminalMeta: SkinMeta = {
	palette: [
		{ name: "Black", value: "#0a0e0a", note: "page bg · void" },
		{ name: "Panel", value: "#0d120d", note: "near-black card" },
		{ name: "Dim green", value: "#14532d", note: "muted border · disabled" },
		{ name: "Green", value: "#22c55e", note: "border · phosphor" },
		{ name: "Bright green", value: "#4ade80", note: "text · foreground" },
		{ name: "Error red", value: "#f87171", note: "aria-invalid" },
		{ name: "Blue", value: "#38bdf8", note: "accent · info" },
		{ name: "Amber", value: "#facc15", note: "accent · warn" },
	],
	type: [
		{
			sample: "DISPLAY",
			spec: "SPACE MONO 700 CAPS · 56 · +0.02EM",
			style: "font-family:var(--skin-font-mono);font-size:56px;font-weight:700;letter-spacing:0.02em;line-height:1;text-transform:uppercase;",
		},
		{
			sample: "HEADING — SYSTEM READOUT",
			spec: "SPACE MONO 700 CAPS · 26 · +0.06EM",
			style: "font-family:var(--skin-font-mono);font-size:26px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;",
		},
		{
			sample: "Body — phosphor glows on a black tube; the cursor blinks and waits for input.",
			spec: "SPACE MONO 400 · 14 · 1.6",
			style: "font-family:var(--skin-font-mono);font-size:14px;font-weight:400;line-height:1.6;max-width:52ch;",
		},
		{
			sample: "$ prompt --input",
			spec: "SPACE MONO 400 · 13 · caret green",
			style: "font-family:var(--skin-font-mono);font-size:13px;font-weight:400;letter-spacing:0.01em;",
		},
		{
			sample: "LABEL · STATUS: OK",
			spec: "SPACE MONO 700 CAPS · 10.5 · +0.14EM",
			style: "font-family:var(--skin-font-mono);font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;",
		},
	],
	specs: {
		radius: [
			{ size: "0px", label: "tag" },
			{ size: "0px", label: "tile" },
			{ size: "0px", label: "nav" },
			{ size: "0px", label: "card" },
			{ size: "0 (square world)", label: "pill" },
		],
		border: "1px solid green (#22c55e), everywhere. Dim green #14532d when muted.",
		shadowRest: "none (flat) · optional phosphor glow via CSS",
		shadowHover: "none · invert on hover (bg fills green, text goes black)",
		spacing: "monospace grid · 4 / 8 / 12 / 16 / 24 · character-cell rhythm",
	},
	responsive: [
		{ label: "Desktop ≥1024", note: "80-column mainframe · left nav column + fluid readout · hover inverts" },
		{ label: "Tablet 720–1023", note: "narrowed to ~64 cols · top status bar + scroll chips · 2-col grid" },
		{ label: "Mobile <720", note: "single 40-col stack · 44px+ tap targets · caret stays blinking" },
	],
};
