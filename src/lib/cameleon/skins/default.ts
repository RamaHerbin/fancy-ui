import type { RecipeArgs, RecipeResult, Skin, SkinMeta } from "../types.js";

const meta: SkinMeta = {
	palette: [
		{ name: "Background", value: "#ffffff", note: "page" },
		{ name: "Foreground", value: "#0a0a0a", note: "text" },
		{ name: "Border", value: "#d4d4d4", note: "lines" },
		{ name: "Accent", value: "#171717", note: "primary" },
	],
	type: [
		{ sample: "Heading", spec: "SYSTEM SANS · 600", style: "font-size:28px;font-weight:600;" },
		{ sample: "Body text", spec: "SYSTEM SANS · 400", style: "font-size:14px;font-weight:400;" },
	],
	specs: {
		radius: [
			{ size: "6px", label: "md" },
			{ size: "9999px", label: "pill" },
		],
		border: "1px solid neutral-300",
		shadowRest: "none",
		shadowHover: "none",
		spacing: "4 / 8 / 12 / 16 / 24",
	},
	responsive: [{ label: "All", note: "fluid single column" }],
};

/**
 * Neutral fallback skin. Used by `useSkin()` when no <FancyProvider> is present,
 * so primitives always render something sane. Deliberately plain — implements
 * the full recipe contract with unstyled-ish neutral defaults.
 */
const FIELD =
	"w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none " +
	"transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-300 " +
	"disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-200";
const CHOICE_ROOT =
	"inline-flex items-center gap-2 cursor-pointer select-none text-sm text-neutral-900";
const CHOICE_BOX =
	"grid place-items-center h-[18px] w-[18px] shrink-0 border border-neutral-400 bg-white transition text-transparent " +
	"peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-300 peer-disabled:opacity-40 " +
	"peer-aria-[invalid=true]:border-red-500 peer-data-[invalid=true]:border-red-500";

const button = (args: RecipeArgs): RecipeResult => ({
	root:
		"cam-btn inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium " +
		"cursor-pointer transition-colors border-neutral-300 focus-visible:outline-none focus-visible:ring-2 " +
		"focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50 " +
		(args.variant === "destructive"
			? "bg-red-600 text-white hover:bg-red-500"
			: args.variant === "secondary"
				? "bg-white text-neutral-900 hover:bg-neutral-100"
				: "bg-neutral-900 text-white hover:bg-neutral-700"),
	label: "",
});

const badge = (args: RecipeArgs): RecipeResult => ({
	root:
		"inline-flex items-center rounded-full border border-neutral-300 bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-700 " +
		"before:content-[''] before:mr-1.5 before:h-[7px] before:w-[7px] before:rounded-full before:bg-neutral-400",
});

export const defaultSkin: Skin = {
	name: "default",
	label: "Default",
	colorScheme: "light",
	meta,
	tokens: {
		"--skin-page-bg": "#ffffff",
		"--skin-page-fg": "#0a0a0a",
		"--skin-font-sans": "ui-sans-serif, system-ui, -apple-system, sans-serif",
	},
	recipes: {
		button,
		badge,
		input: () => ({ root: FIELD }),
		textarea: () => ({ root: `${FIELD} min-h-[80px] resize-y` }),
		select: () => ({
			root: "relative inline-block w-full",
			field: `${FIELD} appearance-none pr-9 cursor-pointer`,
			chevron: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500",
		}),
		checkbox: () => ({
			root: CHOICE_ROOT,
			box: `${CHOICE_BOX} rounded peer-checked:bg-neutral-900 peer-checked:text-white`,
		}),
		radio: () => ({
			root: CHOICE_ROOT,
			box: `${CHOICE_BOX} rounded-full peer-checked:bg-neutral-900`,
		}),
		switch: () => ({
			root:
				"group inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full border border-neutral-300 bg-neutral-200 p-[2px] " +
				"cursor-pointer transition-colors aria-[checked=true]:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 " +
				"focus-visible:ring-neutral-400 disabled:opacity-50",
			thumb:
				"h-[14px] w-[14px] rounded-full bg-white shadow transition-transform group-aria-[checked=true]:translate-x-[18px]",
		}),
		slider: () => ({
			root: "cam-range w-[160px] cursor-pointer appearance-none bg-transparent disabled:opacity-50",
		}),
		tooltip: () => ({
			root: "relative inline-flex group",
			trigger:
				"grid place-items-center h-[26px] w-[26px] rounded-full border border-neutral-300 bg-neutral-900 text-white text-xs font-bold cursor-help",
			bubble:
				"pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white " +
				"opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
		}),
	},
};
