import type { SkinMeta } from "../../types.js";

/** Retro OS design metadata — the exact values from the design system. */
export const retroOsMeta: SkinMeta = {
	palette: [
		{ name: "Desk", value: "#F1E9D4", note: "fond + scanlines" },
		{ name: "Panneau", value: "#FAF5E6", note: "fenêtre" },
		{ name: "Carte", value: "#FDFAF0", note: "tuile interne" },
		{ name: "Encre", value: "#191308", note: "texte · bordures" },
		{ name: "Jaune foncé", value: "#7D6414", note: "01 EXP" },
		{ name: "Rouge", value: "#A0442F", note: "02 PROJ" },
		{ name: "Bleu", value: "#3F62A7", note: "03 SKILLS" },
		{ name: "Vert", value: "#3A6B42", note: "04 EDU" },
		{ name: "Jaune doré", value: "#B8912B", note: "05 LANG" },
	],
	type: [
		{
			sample: "Rama Herbin",
			spec: "ARCHIVO 900 · −1.5PX · 44",
			style: "font-size:40px;font-weight:900;letter-spacing:-1.5px;line-height:1;",
		},
		{
			sample: "TITRE DE FENÊTRE — 12 / 700",
			spec: "SILKSCREEN 700 CAPS · 10–12 · UI PIXEL",
			style: "font-family:var(--skin-font-pixel);font-size:12px;font-weight:700;",
		},
		{
			sample: "Entreprise / projet — 16 / 700",
			spec: "ARCHIVO 700 · 16",
			style: "font-size:16px;font-weight:700;",
		},
		{
			sample: "Corps — 13 / 400, interligne 1.55. Puces carrées.",
			spec: "ARCHIVO 400 · 13 · LH 1.55",
			style: "font-size:13px;font-weight:400;line-height:1.55;max-width:46ch;",
		},
		{
			sample: "DATES — 11 / 600 · STATUT TASKBAR — 12",
			spec: "IBM PLEX MONO 400–700 · 10.5–12.5 · MÉTA",
			style: "font-family:var(--skin-font-mono);font-size:11px;font-weight:600;letter-spacing:1px;",
		},
	],
	specs: {
		radius: [
			{ size: "8/4px", label: "fenêtre — escalier" },
			{ size: "4px", label: "boutons fenêtre" },
			{ size: "0", label: "tout le reste" },
		],
		border:
			"2px encre standard · 3px cadre bureau/barres · 1.5px chips · séparateurs 1px pointillé #B8AC8C",
		shadowRest: "dures, 0 flou — carte/bouton 3×3 · petit bouton 2×2 · bureau 8×8",
		shadowHover: "soulève −1,−1 + ombre +1 · actif s'enfonce +2,+2 + ombre 0 · fenêtre hover 5×5",
		spacing: "grille 4 / 8 / 12 / 16 / 20 / 24",
	},
	responsive: [
		{ label: "Desktop ≥1024", note: "fenêtres tuilées + taskbar fixe · hover lifts on" },
		{ label: "Tablet 720–1023", note: "fenêtres empilées · menubar sticky · chips wrap" },
		{ label: "Mobile <720", note: "colonne unique · cibles 44px+ · ombres réduites 2×2" },
	],
};
