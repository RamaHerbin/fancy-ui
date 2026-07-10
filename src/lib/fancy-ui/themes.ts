/**
 * Theme registry (docs-site theming data).
 *
 * A named theme is a set of CSS-variable overrides applied on top of the base
 * light/dark token sets defined in `src/routes/layout.css`. The theme store
 * (`src/lib/stores/theme.svelte.ts`) applies a theme by setting these variables
 * inline on `<html>`, toggling the `.dark` class per `colorScheme`, and setting
 * a `data-theme` attribute.
 *
 * NOTE: this module is docs/theming data only. It is NOT imported by any shipped
 * component in `src/lib/fancy-ui/*`, so it does not affect the published package.
 */

export type ColorScheme = "light" | "dark";

export interface ThemeDef {
	/** Stable id, used as the `data-theme` value and persistence key. */
	name: string;
	/** Human label shown in the switcher. */
	label: string;
	/** Whether the theme reads as light or dark (drives the `.dark` class). */
	colorScheme: ColorScheme;
	/** CSS custom-property overrides applied on top of the base light/dark set. */
	tokens: Record<string, string>;
	/** Four representative colors for the switcher swatch. */
	swatch: [string, string, string, string];
}

/** Every CSS variable a theme may set. The store clears these before applying a theme. */
export const MANAGED_VARS = [
	"--background",
	"--foreground",
	"--card",
	"--card-foreground",
	"--popover",
	"--popover-foreground",
	"--primary",
	"--primary-foreground",
	"--secondary",
	"--secondary-foreground",
	"--muted",
	"--muted-foreground",
	"--accent",
	"--accent-foreground",
	"--border",
	"--input",
	"--ring",
	"--radius",
	"--rainbow-1",
	"--rainbow-2",
	"--rainbow-3",
	"--rainbow-4",
	"--rainbow-5",
	"--sidebar",
	"--sidebar-foreground",
	"--sidebar-primary",
	"--sidebar-primary-foreground",
	"--sidebar-accent",
	"--sidebar-accent-foreground",
	"--sidebar-border",
] as const;

type ThemeSpec = {
	name: string;
	label: string;
	colorScheme: ColorScheme;
	bg: string;
	fg: string;
	primary: string;
	primaryFg: string;
	accent: string;
	accentFg: string;
	card?: string;
	secondary?: string;
	secondaryFg?: string;
	muted?: string;
	mutedFg?: string;
	border?: string;
	ring?: string;
	radius?: string;
	rainbow?: [string, string, string, string, string];
};

const DEFAULT_RAINBOW: [string, string, string, string, string] = [
	"hsl(0 100% 63%)",
	"hsl(270 100% 63%)",
	"hsl(210 100% 63%)",
	"hsl(195 100% 63%)",
	"hsl(90 100% 63%)",
];

/** Expand a compact spec into a full ThemeDef with a complete token map. */
function defineTheme(s: ThemeSpec): ThemeDef {
	const card = s.card ?? s.bg;
	const secondary = s.secondary ?? s.accent;
	const secondaryFg = s.secondaryFg ?? s.accentFg;
	const muted = s.muted ?? s.border ?? card;
	const mutedFg = s.mutedFg ?? s.fg;
	const border = s.border ?? s.muted ?? s.fg;
	const ring = s.ring ?? s.primary;
	const radius = s.radius ?? "0.625rem";
	const rainbow = s.rainbow ?? DEFAULT_RAINBOW;

	return {
		name: s.name,
		label: s.label,
		colorScheme: s.colorScheme,
		swatch: [s.primary, s.accent, secondary, s.bg],
		tokens: {
			"--background": s.bg,
			"--foreground": s.fg,
			"--card": card,
			"--card-foreground": s.fg,
			"--popover": card,
			"--popover-foreground": s.fg,
			"--primary": s.primary,
			"--primary-foreground": s.primaryFg,
			"--secondary": secondary,
			"--secondary-foreground": secondaryFg,
			"--muted": muted,
			"--muted-foreground": mutedFg,
			"--accent": s.accent,
			"--accent-foreground": s.accentFg,
			"--border": border,
			"--input": border,
			"--ring": ring,
			"--radius": radius,
			"--rainbow-1": rainbow[0],
			"--rainbow-2": rainbow[1],
			"--rainbow-3": rainbow[2],
			"--rainbow-4": rainbow[3],
			"--rainbow-5": rainbow[4],
			"--sidebar": card,
			"--sidebar-foreground": s.fg,
			"--sidebar-primary": s.primary,
			"--sidebar-primary-foreground": s.primaryFg,
			"--sidebar-accent": muted,
			"--sidebar-accent-foreground": s.fg,
			"--sidebar-border": border,
		},
	};
}

/**
 * The theme list.
 *
 * `light` and `dark` carry no token overrides — they are the base look defined
 * by `:root` / `.dark` in `layout.css`. The remaining themes are self-contained.
 * `sunset` / `ocean` / `mono` mirror the theme-generator presets.
 */
export const themes: ThemeDef[] = [
	{
		name: "light",
		label: "Light",
		colorScheme: "light",
		tokens: {},
		swatch: [
			"oklch(0.208 0.042 265.755)",
			"oklch(0.65 0.15 265)",
			"oklch(0.929 0.013 255.508)",
			"#ffffff",
		],
	},
	{
		name: "dark",
		label: "Dark",
		colorScheme: "dark",
		tokens: {},
		swatch: [
			"oklch(0.929 0.013 255.508)",
			"oklch(0.7 0.15 265)",
			"oklch(0.15 0.005 260)",
			"#0a0a0a",
		],
	},
	defineTheme({
		name: "cupcake",
		label: "Cupcake",
		colorScheme: "light",
		bg: "#faf7f5",
		fg: "#291334",
		card: "#ffffff",
		primary: "#65c3c8",
		primaryFg: "#004b50",
		secondary: "#ef9fbc",
		secondaryFg: "#5c2437",
		accent: "#eeaf3a",
		accentFg: "#4a3000",
		border: "#e7e2df",
		radius: "1rem",
	}),
	defineTheme({
		name: "emerald",
		label: "Emerald",
		colorScheme: "light",
		bg: "#ffffff",
		fg: "#333c4d",
		primary: "#66cc8a",
		primaryFg: "#0c3d24",
		secondary: "#377cfb",
		secondaryFg: "#ffffff",
		accent: "#ea5234",
		accentFg: "#ffffff",
		border: "#e5e7eb",
		radius: "0.5rem",
	}),
	defineTheme({
		name: "corporate",
		label: "Corporate",
		colorScheme: "light",
		bg: "#ffffff",
		fg: "#181a2a",
		primary: "#4b6bfb",
		primaryFg: "#ffffff",
		secondary: "#7b92b2",
		secondaryFg: "#ffffff",
		accent: "#67cba0",
		accentFg: "#00382a",
		border: "#e5e7eb",
		radius: "0.25rem",
	}),
	defineTheme({
		name: "retro",
		label: "Retro",
		colorScheme: "light",
		bg: "#ece3ca",
		fg: "#282425",
		card: "#e4d8b4",
		primary: "#ef9995",
		primaryFg: "#282425",
		secondary: "#a4cbb4",
		secondaryFg: "#282425",
		accent: "#dc8850",
		accentFg: "#282425",
		border: "#d1c7a3",
		radius: "0.5rem",
	}),
	defineTheme({
		name: "cyberpunk",
		label: "Cyberpunk",
		colorScheme: "light",
		bg: "#fff248",
		fg: "#0f0f00",
		card: "#fdf700",
		primary: "#ff7598",
		primaryFg: "#330014",
		secondary: "#75d1f0",
		secondaryFg: "#00222e",
		accent: "#c07eec",
		accentFg: "#1e0033",
		border: "#e6dc00",
		radius: "0rem",
		rainbow: [
			"hsl(330 100% 63%)",
			"hsl(280 100% 63%)",
			"hsl(190 100% 60%)",
			"hsl(55 100% 55%)",
			"hsl(150 100% 55%)",
		],
	}),
	defineTheme({
		name: "synthwave",
		label: "Synthwave",
		colorScheme: "dark",
		bg: "#1a103d",
		fg: "#f9f7fd",
		card: "#241650",
		primary: "#e779c1",
		primaryFg: "#2a0e2b",
		secondary: "#58c7f3",
		secondaryFg: "#003044",
		accent: "#f3cc30",
		accentFg: "#3a2e00",
		muted: "#2b1c5e",
		mutedFg: "#b9a9e6",
		border: "#3a2a6b",
		radius: "0.75rem",
		rainbow: [
			"hsl(320 90% 65%)",
			"hsl(280 90% 68%)",
			"hsl(195 95% 60%)",
			"hsl(48 95% 58%)",
			"hsl(160 80% 55%)",
		],
	}),
	defineTheme({
		name: "dracula",
		label: "Dracula",
		colorScheme: "dark",
		bg: "#282a36",
		fg: "#f8f8f2",
		card: "#343746",
		primary: "#ff79c6",
		primaryFg: "#28202b",
		secondary: "#bd93f9",
		secondaryFg: "#241a33",
		accent: "#ffb86c",
		accentFg: "#3a2600",
		muted: "#3a3d4d",
		mutedFg: "#c7c9d6",
		border: "#44475a",
		radius: "0.5rem",
	}),
	defineTheme({
		name: "forest",
		label: "Forest",
		colorScheme: "dark",
		bg: "#171212",
		fg: "#e0ded9",
		card: "#1f1a1a",
		primary: "#1eb854",
		primaryFg: "#04220f",
		secondary: "#1fd65f",
		secondaryFg: "#04220f",
		accent: "#d99330",
		accentFg: "#2b1c00",
		muted: "#26201f",
		mutedFg: "#b3b0aa",
		border: "#2e2726",
		radius: "0.75rem",
	}),
	defineTheme({
		name: "sunset",
		label: "Sunset",
		colorScheme: "dark",
		bg: "#1c1410",
		fg: "#f5e9e0",
		card: "#261a13",
		primary: "oklch(0.62 0.19 30)",
		primaryFg: "#22100a",
		secondary: "oklch(0.7 0.17 8)",
		secondaryFg: "#2a0d0a",
		accent: "oklch(0.7 0.17 8)",
		accentFg: "#2a0d0a",
		muted: "#33241b",
		mutedFg: "#d8c3b4",
		border: "#3a2a20",
		radius: "1rem",
		rainbow: [
			"hsl(12 100% 63%)",
			"hsl(30 100% 63%)",
			"hsl(350 100% 63%)",
			"hsl(320 100% 63%)",
			"hsl(50 100% 63%)",
		],
	}),
	defineTheme({
		name: "ocean",
		label: "Ocean",
		colorScheme: "light",
		bg: "#f4fbff",
		fg: "#0b2a3a",
		card: "#ffffff",
		primary: "oklch(0.55 0.13 230)",
		primaryFg: "#ffffff",
		secondary: "oklch(0.72 0.13 190)",
		secondaryFg: "#00303a",
		accent: "oklch(0.72 0.13 190)",
		accentFg: "#00303a",
		muted: "#e3f1f9",
		mutedFg: "#3a5c6b",
		border: "#d3e7f0",
		radius: "0.5rem",
		rainbow: [
			"hsl(200 100% 63%)",
			"hsl(220 100% 63%)",
			"hsl(180 100% 63%)",
			"hsl(240 100% 63%)",
			"hsl(160 100% 63%)",
		],
	}),
	defineTheme({
		name: "mono",
		label: "Mono",
		colorScheme: "dark",
		bg: "#0a0a0a",
		fg: "#fafafa",
		card: "#161616",
		primary: "oklch(0.32 0 0)",
		primaryFg: "#fafafa",
		secondary: "oklch(0.6 0 0)",
		secondaryFg: "#0a0a0a",
		accent: "oklch(0.6 0 0)",
		accentFg: "#0a0a0a",
		muted: "#1e1e1e",
		mutedFg: "#a3a3a3",
		border: "#2a2a2a",
		radius: "0.25rem",
		rainbow: ["hsl(0 0% 80%)", "hsl(0 0% 65%)", "hsl(0 0% 90%)", "hsl(0 0% 55%)", "hsl(0 0% 75%)"],
	}),
];

const themeByName = new Map(themes.map((t) => [t.name, t]));

export function getTheme(name: string): ThemeDef | undefined {
	return themeByName.get(name);
}

export const themeNames = themes.map((t) => t.name);
export const DEFAULT_THEME = "light";
