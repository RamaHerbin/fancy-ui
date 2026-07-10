import type { SkinMeta } from "../../types.js";

/** Glass design metadata — frosted translucent surfaces on a purple gradient world. */
export const glassMeta: SkinMeta = {
	palette: [
		{ name: "Glass 8%", value: "rgba(255,255,255,0.08)", note: "section card" },
		{ name: "Glass 12%", value: "rgba(255,255,255,0.12)", note: "inner surface" },
		{ name: "Border 25%", value: "rgba(255,255,255,0.25)", note: "hairline edge" },
		{ name: "Blue", value: "#7dd3fc", note: "accent · info" },
		{ name: "Red", value: "#fca5a5", note: "accent · error" },
		{ name: "Yellow", value: "#fde68a", note: "accent · warn" },
		{ name: "Green", value: "#86efac", note: "accent · ok" },
		{ name: "Purple", value: "#c4b5fd", note: "accent · brand" },
	],
	type: [
		{
			sample: "Display",
			spec: "SYSTEM SANS 600 · -0.03EM · CLAMP(48, 8VW, 112)",
			style: "font-size:60px;font-weight:600;letter-spacing:-0.03em;line-height:1;",
		},
		{
			sample: "Heading — section title",
			spec: "SYSTEM SANS 600 · 22–30",
			style: "font-size:28px;font-weight:600;letter-spacing:-0.02em;",
		},
		{
			sample: "Subheading — frosted panel",
			spec: "SYSTEM SANS 500 · 16–19",
			style: "font-size:18px;font-weight:500;letter-spacing:-0.01em;",
		},
		{
			sample: "Body — Translucent surfaces float above a deep gradient, softened by blur and bloom.",
			spec: "SYSTEM SANS 400 · 14–16 · 1.6 LINE",
			style: "font-size:15px;font-weight:400;line-height:1.6;max-width:52ch;",
		},
		{
			sample: "mono-label — rgba(255,255,255,0.12)",
			spec: "SF MONO 500 · 10–12 + 0.02EM",
			style: "font-family:var(--skin-font-mono);font-size:11px;font-weight:500;letter-spacing:0.02em;",
		},
	],
	specs: {
		radius: [
			{ size: "12px", label: "tile · input" },
			{ size: "16px", label: "card" },
			{ size: "24px", label: "button · panel" },
			{ size: "999px", label: "pill · badge" },
		],
		border: "1px translucent white (rgba(255,255,255,.25)), hairline on every surface.",
		shadowRest: "0 2px 12px rgba(0,0,0,.18)",
		shadowHover: "0 12px 34px rgba(0,0,0,.30) soft bloom",
		spacing: "4 / 8 / 12 / 16 / 24",
	},
	responsive: [
		{ label: "Desktop ≥1024", note: "wide frosted panels · blur + bloom on hover · 2–3 col grids" },
		{ label: "Tablet 720–1023", note: "stacked glass cards · reduced blur radius · 2-col grids" },
		{ label: "Mobile <720", note: "single column · solid-leaning surfaces for legibility · 44px targets" },
	],
};
