/**
 * Aurora recipes — the full "Core components" set in the library's own voice.
 * Near-black surfaces, hairline `border-white/10` edges, a violet→blue sweep on
 * anything primary, and a soft violet bloom instead of a hard shadow.
 *
 * Static class literals only (Tailwind JIT-safe). States are attribute-driven:
 * primitives set `disabled`, `aria-invalid`, `aria-checked` and Tailwind's state
 * variants (hover, focus, peer-, group-, disabled, aria) do the rest.
 *
 * Focus = `ring-2 ring-[#8b7bff]/60`. Error = rose border + ring, text left
 * readable. The bloom on `.cam-btn` is added by aurora.css.
 */
import type { PartState, RecipeArgs, RecipeResult, SkinRecipes } from "../../types.js";

const forced = (map: Partial<Record<PartState, string>>, state?: PartState): string =>
	(state && map[state]) || "";

// The signature violet→blue sweep is `bg-[linear-gradient(100deg,#7c3aed,#3b82f6)]`.
// It is written out in full at every use site on purpose: Tailwind v4 scans raw
// source text, so hoisting it into a const and interpolating would leave the JIT
// staring at `${SWEEP}` and the class would never be generated.

/* ---- Button ------------------------------------------------------------- */
const BTN_BASE =
	"relative inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold " +
	"whitespace-nowrap cursor-pointer select-none " +
	"transition duration-200 ease-out " +
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7bff]/60 " +
	"disabled:pointer-events-none disabled:opacity-40";

const BTN_SIZE = {
	sm: "px-3.5 py-1.5 text-xs",
	md: "px-[18px] py-2.5 text-sm",
	lg: "px-6 py-3 text-base",
} as const;

const BTN_VARIANT = {
	primary:
		"border-transparent bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] text-white " +
		"shadow-[0_2px_16px_rgba(124,58,237,0.35)] " +
		"hover:shadow-[0_10px_34px_rgba(91,140,255,0.45)] hover:brightness-110",
	secondary:
		"border-white/12 bg-white/[0.04] text-[#e6e9ef] hover:border-white/25 hover:bg-white/[0.08]",
	destructive:
		"border-rose-400/40 bg-rose-500/20 text-rose-100 hover:bg-rose-500/35 " +
		"focus-visible:ring-rose-400/60",
} as const;
const BTN_FORCE: Partial<Record<PartState, string>> = {
	hover: "shadow-[0_10px_34px_rgba(91,140,255,0.45)] brightness-110",
	active: "brightness-95 shadow-[0_2px_16px_rgba(124,58,237,0.35)]",
	focus: "ring-2 ring-[#8b7bff]/60",
};

export function auroraButton(args: RecipeArgs): RecipeResult {
	const size = BTN_SIZE[(args.size as keyof typeof BTN_SIZE) ?? "md"] ?? BTN_SIZE.md;
	const variant =
		BTN_VARIANT[(args.variant as keyof typeof BTN_VARIANT) ?? "primary"] ?? BTN_VARIANT.primary;
	return { root: `${BTN_BASE} ${size} ${variant} ${forced(BTN_FORCE, args.state)}`, label: "" };
}

/* ---- Text fields (input / textarea / select) ---------------------------- */
const FIELD_BASE =
	"w-full rounded-[10px] border border-white/10 bg-white/[0.03] px-3.5 py-2 " +
	"text-sm text-[#e6e9ef] outline-none " +
	"transition duration-200 ease-out " +
	"placeholder:text-[#6b7280] " +
	"hover:border-white/20 hover:bg-white/[0.05] " +
	"focus:border-[#8b7bff]/70 focus:ring-2 focus:ring-[#8b7bff]/40 " +
	"disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.03] " +
	"aria-[invalid=true]:border-rose-400/60 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-rose-400/30";
const FIELD_FORCE: Partial<Record<PartState, string>> = {
	hover: "border-white/20 bg-white/[0.05]",
	active: "bg-white/[0.05]",
	focus: "border-[#8b7bff]/70 ring-2 ring-[#8b7bff]/40",
};

export const auroraInput = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} ${forced(FIELD_FORCE, args.state)}`,
});

export const auroraTextarea = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} min-h-[80px] leading-relaxed resize-y ${forced(FIELD_FORCE, args.state)}`,
});

export const auroraSelect = (args: RecipeArgs): RecipeResult => ({
	root: "relative inline-block w-full",
	field: `${FIELD_BASE} appearance-none pr-9 cursor-pointer ${forced(FIELD_FORCE, args.state)}`,
	chevron: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]",
});

/* ---- Checkbox / Radio (native input + custom box) ----------------------- */
const CHOICE_ROOT =
	"inline-flex items-center gap-2 cursor-pointer select-none text-sm text-[#e6e9ef] " +
	"has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";
const CHOICE_BOX_BASE =
	"grid place-items-center h-[18px] w-[18px] shrink-0 border border-white/20 bg-white/[0.03] " +
	"transition text-transparent " +
	"peer-focus-visible:ring-2 peer-focus-visible:ring-[#8b7bff]/50 " +
	"peer-disabled:opacity-40 " +
	"peer-aria-[invalid=true]:border-rose-400/60 peer-aria-[invalid=true]:ring-2 peer-aria-[invalid=true]:ring-rose-400/30 " +
	"peer-data-[invalid=true]:border-rose-400/60 peer-data-[invalid=true]:ring-2 peer-data-[invalid=true]:ring-rose-400/30";
const CHOICE_FORCE: Partial<Record<PartState, string>> = {
	hover: "border-white/35 bg-white/[0.07]",
	focus: "border-[#8b7bff]/70 ring-2 ring-[#8b7bff]/40",
};

export const auroraCheckbox = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box:
		`${CHOICE_BOX_BASE} rounded-[5px] peer-checked:border-transparent ` +
		"peer-checked:bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] peer-checked:text-white " +
		forced(CHOICE_FORCE, args.state),
});

export const auroraRadio = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box:
		`${CHOICE_BOX_BASE} rounded-full peer-checked:border-transparent ` +
		"peer-checked:bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] " +
		forced(CHOICE_FORCE, args.state),
});

/* ---- Switch (button role=switch) ---------------------------------------- */
const SWITCH_FORCE: Partial<Record<PartState, string>> = {
	hover: "border-white/35",
	focus: "border-[#8b7bff]/70 ring-2 ring-[#8b7bff]/40",
};

export const auroraSwitch = (args: RecipeArgs): RecipeResult => ({
	root:
		"group inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full border border-white/15 " +
		"bg-white/[0.06] p-[2px] cursor-pointer transition-colors " +
		"aria-[checked=true]:border-transparent " +
		"aria-[checked=true]:bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] " +
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7bff]/50 " +
		"disabled:opacity-40 disabled:cursor-not-allowed " +
		"aria-[invalid=true]:border-rose-400/60 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-rose-400/30 " +
		forced(SWITCH_FORCE, args.state),
	thumb:
		"h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.5)] " +
		"transition-transform group-aria-[checked=true]:translate-x-[18px]",
});

/* ---- Slider (native range; thumb/track in aurora.css via .cam-range) ----- */
export const auroraSlider = (): RecipeResult => ({
	root: "cam-range w-[160px] cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
});

/* ---- Badge -------------------------------------------------------------- */
const BADGE_BASE =
	"inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium " +
	"before:content-[''] before:mr-1.5 before:h-[7px] before:w-[7px] before:rounded-full before:shrink-0";
const BADGE_VARIANT = {
	default: "border-white/12 bg-white/[0.05] text-[#c3cadf] before:bg-[#8b7bff]",
	solid: "border-transparent bg-[#f8fafc] text-[#0a0a0e] before:bg-[#0a0a0e]",
	blue: "border-[#5b8cff]/30 bg-[#5b8cff]/15 text-[#bfd4ff] before:bg-[#5b8cff]",
	red: "border-rose-400/30 bg-rose-400/15 text-rose-200 before:bg-rose-400",
	yellow: "border-amber-400/30 bg-amber-400/15 text-amber-200 before:bg-amber-400",
	green: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200 before:bg-emerald-400",
	purple: "border-[#8b7bff]/30 bg-[#8b7bff]/15 text-[#d3ccff] before:bg-[#8b7bff]",
} as const;
const BADGE_FORCE: Partial<Record<PartState, string>> = {
	hover: "border-white/25 bg-white/[0.09]",
	active: "border-transparent bg-[#f8fafc] text-[#0a0a0e] before:bg-[#0a0a0e]",
	focus: "border-[#8b7bff]/70 ring-2 ring-[#8b7bff]/40",
	disabled: "border-white/8 bg-white/[0.02] text-[#6b7280] before:bg-[#6b7280]",
	error: "border-rose-400/40 bg-rose-400/15 text-rose-200 before:bg-rose-400",
};

export function auroraBadge(args: RecipeArgs): RecipeResult {
	const variant =
		BADGE_VARIANT[(args.variant as keyof typeof BADGE_VARIANT) ?? "default"] ??
		BADGE_VARIANT.default;
	return { root: `${BADGE_BASE} ${variant} ${forced(BADGE_FORCE, args.state)}` };
}

/* ---- Tooltip ------------------------------------------------------------ */
const TT_TRIGGER: Partial<Record<PartState, string>> = {
	focus: "border-[#8b7bff]/70 ring-2 ring-[#8b7bff]/40",
	error: "border-rose-400/60 bg-rose-400/15 text-rose-200",
};
const TT_BUBBLE: Partial<Record<PartState, string>> = {
	focus: "border-[#8b7bff]/50 opacity-100",
	error: "border-rose-400/50 bg-rose-950/90 opacity-100",
};

export const auroraTooltip = (args: RecipeArgs): RecipeResult => ({
	root: "relative inline-flex group",
	trigger:
		"grid place-items-center h-[26px] w-[26px] rounded-full border border-white/15 " +
		"bg-white/[0.05] text-[#e6e9ef] text-[12px] font-semibold cursor-help " +
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7bff]/50 " +
		forced(TT_TRIGGER, args.state),
	bubble:
		"pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap " +
		"rounded-[10px] border border-white/10 bg-[#12121c] px-3 py-1.5 text-[12px] font-medium text-[#e6e9ef] " +
		"opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 " +
		"shadow-[0_10px_30px_rgba(0,0,0,0.6)] " +
		forced(TT_BUBBLE, args.state),
});

/* ---- Skin registry ------------------------------------------------------ */
export const auroraRecipes: SkinRecipes = {
	button: auroraButton,
	input: auroraInput,
	textarea: auroraTextarea,
	select: auroraSelect,
	checkbox: auroraCheckbox,
	radio: auroraRadio,
	switch: auroraSwitch,
	slider: auroraSlider,
	badge: auroraBadge,
	tooltip: auroraTooltip,
};
