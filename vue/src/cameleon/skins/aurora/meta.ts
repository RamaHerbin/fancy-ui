import type { SkinMeta } from "../../types.js";

/** Aurora design metadata — near-black canvas, violet→blue sweep, hairline edges. */
export const auroraMeta: SkinMeta = {
	palette: [
		{ name: "Canvas", value: "#050508", note: "page" },
		{ name: "Card", value: "#0d0d14", note: "section card" },
		{ name: "Surface", value: "#12121c", note: "inner surface" },
		{ name: "Line 10%", value: "rgba(255,255,255,0.10)", note: "hairline edge" },
		{ name: "Purple", value: "#8b7bff", note: "accent · brand" },
		{ name: "Blue", value: "#5b8cff", note: "accent · info" },
		{ name: "Red", value: "#fb7185", note: "accent · error" },
		{ name: "Yellow", value: "#fbbf24", note: "accent · warn" },
		{ name: "Green", value: "#34d399", note: "accent · ok" },
	],
	type: [
		{
			sample: "Display",
			spec: "SYSTEM SANS 700 · -0.03EM · CLAMP(44, 7VW, 92)",
			style: "font-size:60px;font-weight:700;letter-spacing:-0.03em;line-height:1.05;",
		},
		{
			sample: "Heading — section title",
			spec: "SYSTEM SANS 600 · 24–34",
			style: "font-size:30px;font-weight:600;letter-spacing:-0.02em;",
		},
		{
			sample: "Subheading — panel label",
			spec: "SYSTEM SANS 500 · 15–18",
			style: "font-size:17px;font-weight:500;letter-spacing:-0.01em;",
		},
		{
			sample:
				"Body — A near-black field, one violet accent, and nothing else competing for attention.",
			spec: "SYSTEM SANS 400 · 14–16 · 1.6 LINE",
			style: "font-size:15px;font-weight:400;line-height:1.6;max-width:52ch;",
		},
		{
			sample: "mono-label — #8b7bff",
			spec: "SF MONO 500 · 10–12 + 0.08EM",
			style:
				"font-family:var(--skin-font-mono);font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;",
		},
	],
	specs: {
		radius: [
			{ size: "10px", label: "button · input" },
			{ size: "14px", label: "card" },
			{ size: "20px", label: "panel" },
			{ size: "999px", label: "pill · badge" },
		],
		border: "1px hairline white at 8–12% opacity; brightens to 25% on hover.",
		shadowRest: "0 2px 16px rgba(124,58,237,.35) — violet bloom, not a drop shadow",
		shadowHover: "0 10px 34px rgba(91,140,255,.45)",
		spacing: "4 / 8 / 14 / 18 / 24",
	},
	responsive: [
		{ label: "Desktop ≥1024", note: "1440 max width · 3-col panels · full bloom and glow" },
		{ label: "Tablet 720–1023", note: "2-col panels · bloom radius halved · nav collapses" },
		{ label: "Mobile <720", note: "single column · glow dropped for contrast · 44px targets" },
	],
};
