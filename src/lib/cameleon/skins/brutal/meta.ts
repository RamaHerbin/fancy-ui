import type { SkinMeta } from "../../types.js";

/** Brutal design metadata — the exact values from the design system. */
export const brutalMeta: SkinMeta = {
	palette: [
		{ name: "Paper", value: "#F4EEE0", note: "page bg" },
		{ name: "Card", value: "#FBF7EB", note: "section card" },
		{ name: "Surface", value: "#FFFCF2", note: "inner tile" },
		{ name: "Ink", value: "#141414", note: "text · borders" },
		{ name: "Blue", value: "#1B6EF3", note: "01 about" },
		{ name: "Red", value: "#E5372B", note: "02 experience" },
		{ name: "Yellow", value: "#F5B40C", note: "03 · CTA strip" },
		{ name: "Green", value: "#12A147", note: "04 skills" },
		{ name: "Purple", value: "#8E55E9", note: "05 · exp/AI" },
	],
	type: [
		{
			sample: "Display",
			spec: "ARCHIVO 900 · -0.04EM · PRINT 56–72 · WEB CLAMP(52, 9VW, 124)",
			style: "font-size:62px;font-weight:900;letter-spacing:-0.04em;line-height:0.95;",
		},
		{
			sample: "Heading — section title",
			spec: "ARCHIVO 850 · 20–30",
			style: "font-size:28px;font-weight:850;letter-spacing:-0.02em;",
		},
		{
			sample: "CARD HEADER — EXPERIENCE",
			spec: "ARCHIVO 800 CAPS · 13.5 + 0.06EM",
			style: "font-size:15px;font-weight:800;letter-spacing:0.06em;",
		},
		{
			sample: "Job title — Software Engineer",
			spec: "ARCHIVO 800 · 13.5 PRINT / 19 WEB",
			style: "font-size:17px;font-weight:800;letter-spacing:-0.01em;",
		},
		{
			sample: "Body — I design and build the layer where product, code and craft meet.",
			spec: "ARCHIVO 500 · 11.6–12 PRINT / 13–16.5 WEB",
			style: "font-size:14px;font-weight:500;line-height:1.5;max-width:46ch;",
		},
		{
			sample: "MONO LABEL — LYON, FRANCE · / 02",
			spec: "SPACE MONO 700 CAPS · 8.5–11 + 0.05–0.14EM",
			style: "font-family:var(--skin-font-mono);font-size:10px;font-weight:700;letter-spacing:0.1em;",
		},
	],
	specs: {
		radius: [
			{ size: "4px", label: "tag" },
			{ size: "8–10px", label: "tile" },
			{ size: "12px", label: "nav" },
			{ size: "14–16px", label: "card" },
			{ size: "999px", label: "pill" },
		],
		border: "1.5px solid ink, everywhere. 1.3px on small pills.",
		shadowRest: "0 10px 18px rgba(60,50,20,.07) soft ambient",
		shadowHover: "4px 4px 0 ink, hard offset + translate(-2,-2)",
		spacing: "4 / 8 / 10 / 14 / 18 / 28 · pixel grid cell 24–28px",
	},
	responsive: [
		{ label: "Desktop ≥1024", note: "sticky left nav 264px + fluid content · hover lifts on" },
		{ label: "Tablet 720–1023", note: "sticky top bar + scroll nav chips · 2-col grids" },
		{ label: "Mobile <720", note: "single column · 44px+ tap targets" },
	],
};
