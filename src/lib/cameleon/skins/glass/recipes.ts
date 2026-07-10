/**
 * Glass recipes — the full "Core components" set, frosted-glass art direction.
 * Translucent surfaces on a dark/gradient world: light text, `bg-white/10..15`,
 * `border-white/20..25`, `backdrop-blur-md`, soft shadows and gentle transitions.
 * Static class literals only (Tailwind JIT-safe). States are attribute-driven:
 * primitives set `disabled`, `aria-invalid`, `aria-checked` and Tailwind's
 * state variants (hover, focus, peer-, group-, disabled, aria) do the rest.
 *
 * Focus = `ring-2 ring-white/50` (no hard offset). Error = red-tinted glass
 * (`border-red-300/50`, `ring-red-400/40`) with text kept readable/white.
 * A specular top-sheen is added by glass.css via `[data-skin="glass"] .cam-btn`.
 */
import type { PartState, RecipeArgs, RecipeResult, SkinRecipes } from "../../types.js";

const forced = (map: Partial<Record<PartState, string>>, state?: PartState): string =>
	(state && map[state]) || "";

/* ---- Button ------------------------------------------------------------- */
const BTN_BASE =
	"relative inline-flex items-center justify-center gap-2 rounded-2xl border font-medium " +
	"whitespace-nowrap cursor-pointer select-none backdrop-blur-md " +
	"transition duration-200 ease-out " +
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 " +
	"disabled:pointer-events-none disabled:opacity-40";

const BTN_SIZE = {
	sm: "px-4 py-1.5 text-xs",
	md: "px-5 py-2.5 text-sm",
	lg: "px-6 py-3 text-base",
} as const;

const BTN_VARIANT = {
	primary:
		"border-white/25 bg-white/15 text-white shadow-[0_2px_12px_rgba(0,0,0,0.18)] " +
		"hover:bg-white/25 hover:shadow-[0_12px_34px_rgba(0,0,0,0.30)]",
	secondary: "border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/15",
	destructive:
		"border-red-300/40 bg-red-500/25 text-white hover:bg-red-500/40 " +
		"focus-visible:ring-red-300/60",
} as const;
const BTN_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-white/25 shadow-[0_12px_34px_rgba(0,0,0,0.30)]",
	active: "bg-white/30 shadow-[0_2px_12px_rgba(0,0,0,0.18)]",
	focus: "ring-2 ring-white/50",
};

export function glassButton(args: RecipeArgs): RecipeResult {
	const size = BTN_SIZE[(args.size as keyof typeof BTN_SIZE) ?? "md"] ?? BTN_SIZE.md;
	const variant =
		BTN_VARIANT[(args.variant as keyof typeof BTN_VARIANT) ?? "primary"] ?? BTN_VARIANT.primary;
	return { root: `${BTN_BASE} ${size} ${variant} ${forced(BTN_FORCE, args.state)}`, label: "" };
}

/* ---- Text fields (input / textarea / select) ---------------------------- */
const FIELD_BASE =
	"w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 " +
	"text-sm text-white outline-none backdrop-blur-md " +
	"transition duration-200 ease-out " +
	"placeholder:text-white/40 " +
	"hover:bg-white/15 hover:border-white/25 " +
	"focus:border-white/40 focus:ring-2 focus:ring-white/50 " +
	"disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10 " +
	"aria-[invalid=true]:border-red-300/50 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-400/40";
const FIELD_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-white/15 border-white/25",
	active: "bg-white/15",
	focus: "border-white/40 ring-2 ring-white/50",
};

export const glassInput = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} ${forced(FIELD_FORCE, args.state)}`,
});

export const glassTextarea = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} min-h-[80px] leading-relaxed resize-y ${forced(FIELD_FORCE, args.state)}`,
});

export const glassSelect = (args: RecipeArgs): RecipeResult => ({
	root: "relative inline-block w-full",
	field: `${FIELD_BASE} appearance-none pr-9 cursor-pointer ${forced(FIELD_FORCE, args.state)}`,
	chevron: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70",
});

/* ---- Checkbox / Radio (native input + custom box) ----------------------- */
const CHOICE_ROOT =
	"inline-flex items-center gap-2 cursor-pointer select-none text-sm text-white " +
	"has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";
const CHOICE_BOX_BASE =
	"grid place-items-center h-[18px] w-[18px] shrink-0 border border-white/25 bg-white/10 " +
	"backdrop-blur-md transition text-transparent " +
	"peer-focus-visible:ring-2 peer-focus-visible:ring-white/50 " +
	"peer-disabled:opacity-40 " +
	"peer-aria-[invalid=true]:border-red-300/50 peer-aria-[invalid=true]:ring-2 peer-aria-[invalid=true]:ring-red-400/40 " +
	"peer-data-[invalid=true]:border-red-300/50 peer-data-[invalid=true]:ring-2 peer-data-[invalid=true]:ring-red-400/40";
const CHOICE_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-white/20 border-white/40",
	focus: "border-white/40 ring-2 ring-white/50",
};

export const glassCheckbox = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box: `${CHOICE_BOX_BASE} rounded-md peer-checked:bg-white/80 peer-checked:border-white/60 peer-checked:text-black ${forced(CHOICE_FORCE, args.state)}`,
});

export const glassRadio = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box: `${CHOICE_BOX_BASE} rounded-full peer-checked:bg-white/80 peer-checked:border-white/60 ${forced(CHOICE_FORCE, args.state)}`,
});

/* ---- Switch (button role=switch) ---------------------------------------- */
const SWITCH_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-white/20 border-white/40",
	focus: "border-white/40 ring-2 ring-white/50",
};

export const glassSwitch = (args: RecipeArgs): RecipeResult => ({
	root:
		"group inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full border border-white/25 " +
		"bg-white/10 p-[2px] cursor-pointer backdrop-blur-md transition-colors " +
		"aria-[checked=true]:bg-white/40 aria-[checked=true]:border-white/40 " +
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 " +
		"disabled:opacity-40 disabled:cursor-not-allowed " +
		"aria-[invalid=true]:border-red-300/50 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-400/40 " +
		forced(SWITCH_FORCE, args.state),
	thumb:
		"h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] " +
		"transition-transform group-aria-[checked=true]:translate-x-[18px]",
});

/* ---- Slider (native range; thumb/track in glass.css via .cam-range) ------ */
export const glassSlider = (): RecipeResult => ({
	root: "cam-range w-[160px] cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
});

/* ---- Badge -------------------------------------------------------------- */
const BADGE_BASE =
	"inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md " +
	"before:content-[''] before:mr-1.5 before:h-[7px] before:w-[7px] before:rounded-full before:shrink-0";
const BADGE_VARIANT = {
	default: "border-white/25 bg-white/10 text-white before:bg-white",
	solid: "border-white/60 bg-white/90 text-black before:bg-black",
	blue: "border-blue-300/40 bg-blue-400/20 text-blue-100 before:bg-blue-300",
	red: "border-red-300/40 bg-red-400/20 text-red-100 before:bg-red-300",
	yellow: "border-yellow-300/40 bg-yellow-400/20 text-yellow-100 before:bg-yellow-300",
	green: "border-green-300/40 bg-green-400/20 text-green-100 before:bg-green-300",
	purple: "border-purple-300/40 bg-purple-400/20 text-purple-100 before:bg-purple-300",
} as const;
// The badge state row (default variant, 6 states). Forced overrides the resting look.
const BADGE_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.18)]",
	active: "bg-white/90 text-black before:bg-black",
	focus: "border-white/40 ring-2 ring-white/50",
	disabled: "border-white/15 bg-white/[0.04] text-white/40 before:bg-white/40",
	error: "border-red-300/50 bg-red-400/20 text-red-100 before:bg-red-300",
};

export function glassBadge(args: RecipeArgs): RecipeResult {
	const variant =
		BADGE_VARIANT[(args.variant as keyof typeof BADGE_VARIANT) ?? "default"] ?? BADGE_VARIANT.default;
	return { root: `${BADGE_BASE} ${variant} ${forced(BADGE_FORCE, args.state)}` };
}

/* ---- Tooltip ------------------------------------------------------------ */
// Tooltip has default / focus / error variants (via args.state); no active/disabled.
const TT_TRIGGER: Partial<Record<PartState, string>> = {
	focus: "border-white/40 ring-2 ring-white/50",
	error: "border-red-300/50 bg-red-400/20 text-red-100",
};
const TT_BUBBLE: Partial<Record<PartState, string>> = {
	focus: "border-white/40 ring-2 ring-white/50 opacity-100",
	error: "border-red-300/50 bg-red-500/70 opacity-100",
};

export const glassTooltip = (args: RecipeArgs): RecipeResult => ({
	root: "relative inline-flex group",
	trigger:
		"grid place-items-center h-[26px] w-[26px] rounded-full border border-white/25 " +
		"bg-white/10 backdrop-blur-md text-white text-[12px] font-semibold cursor-help " +
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 " +
		forced(TT_TRIGGER, args.state),
	bubble:
		"pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap " +
		"rounded-xl border border-white/15 bg-black/70 backdrop-blur-md px-3 py-1.5 text-[12px] font-medium text-white " +
		"opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 " +
		"shadow-[0_10px_30px_rgba(0,0,0,0.4)] " +
		forced(TT_BUBBLE, args.state),
});

/* ---- Skin registry ------------------------------------------------------ */
export const glassRecipes: SkinRecipes = {
	button: glassButton,
	input: glassInput,
	textarea: glassTextarea,
	select: glassSelect,
	checkbox: glassCheckbox,
	radio: glassRadio,
	switch: glassSwitch,
	slider: glassSlider,
	badge: glassBadge,
	tooltip: glassTooltip,
};
