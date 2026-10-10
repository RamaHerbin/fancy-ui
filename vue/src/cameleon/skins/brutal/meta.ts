import type { SkinMeta } from "../../types.js";

/** Brutal design metadata — the exact values from the design reference. */
export const brutalMeta: SkinMeta = {
	palette: [
		{ name: "Paper", value: "#F4EEE0", note: "page · sidebar · header" },
		{ name: "Card", value: "#FBF7EB", note: "cards · pills · search" },
		{ name: "Surface", value: "#FFFCF2", note: "inline code chip" },
		{ name: "Ink", value: "#141414", note: "text · borders · code bg" },
		{ name: "Blue", value: "#1B6EF3", note: "active nav · link · focus" },
		{ name: "Blue 700", value: "#144FB0", note: "link hover" },
		{ name: "Red", value: "#E5372B", note: "category dot · step 02" },
		{ name: "Yellow", value: "#F5B40C", note: "CTA strip · press flash" },
		{ name: "Green", value: "#12A147", note: "category dot · tile" },
		{ name: "Purple", value: "#8E55E9", note: "category dot · lede" },
	],
	type: [
		{
			sample: "Display",
			spec: "ARCHIVO 900 · -0.035EM · CLAMP(38, 5VW, 56)",
			style: "font-size:56px;font-weight:900;letter-spacing:-0.035em;line-height:0.98;",
		},
		{
			sample: "Heading — section title",
			spec: "ARCHIVO 850 · -0.015EM · CLAMP(19, 2VW, 23)",
			style: "font-size:23px;font-weight:850;letter-spacing:-0.015em;",
		},
		{
			sample: "Card head — Svelte 5 native",
			spec: "ARCHIVO 800 · 14.5",
			style: "font-size:14.5px;font-weight:800;",
		},
		{
			sample: "Nav item — Introduction",
			spec: "ARCHIVO 600 · 13.5 · ACTIVE 750",
			style: "font-size:13.5px;font-weight:600;",
		},
		{
			sample: "Lede — 50+ animated, interactive components you can drop into any page.",
			spec: "ARCHIVO 500 · CLAMP(15, 1.4VW, 18) · LH 1.55",
			style: "font-size:18px;font-weight:500;line-height:1.55;max-width:56ch;",
		},
		{
			sample: "MONO LABEL — GETTING STARTED",
			spec: "SPACE MONO 700 CAPS · 7.5–12 + 0.1EM",
			style:
				"font-family:var(--skin-font-mono);font-size:10px;font-weight:700;letter-spacing:0.1em;",
		},
	],
	specs: {
		radius: [
			{ size: "3px", label: "marker" },
			{ size: "5px", label: "chip" },
			{ size: "7px", label: "tile" },
			{ size: "9px", label: "nav" },
			{ size: "10px", label: "code" },
			{ size: "12px", label: "card" },
			{ size: "999px", label: "pill" },
		],
		border: "1.5px solid ink everywhere · 1.3px inline chips · 1px 8px markers.",
		shadowRest: "0 8px 16px rgba(60,50,20,.07) soft ambient — never a hard offset at rest",
		shadowHover: "3–4px hard offset 0 ink + translate(-1,-1) / (-2,-2), hover only",
		spacing: "3 / 4 / 6 / 8 / 10 / 12 / 14 / 18 / 20 / 32 / 38 / 40",
	},
	responsive: [
		{
			label: "Desktop ≥1180",
			note: "sidebar 264px + rail 200px · full breadcrumb · hover lifts on",
		},
		{ label: "Tablet 768–1179", note: "sidebar + rail hidden · compact header · 28px FU tile" },
		{ label: "Mobile <768", note: "search pill + language button hidden · 44px+ tap targets" },
	],
};
