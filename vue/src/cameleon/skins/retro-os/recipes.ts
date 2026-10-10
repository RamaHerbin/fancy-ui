/**
 * Retro-OS recipes — the full "Core components" set in a late-90s desktop-OS art
 * direction: hard square corners (`rounded-none`), thick 2px ink borders, and
 * zero-blur block shadows that make every control feel like a physical chip.
 * Motion is a tactile press: hover LIFTS the control (nudge up-left, shadow grows
 * a pixel), active SINKS it (nudge down-right, shadow collapses to none).
 *
 * Static class literals only (Tailwind JIT-safe). Live states are attribute-driven
 * (disabled / aria-invalid / aria-checked + hover / focus / peer / group variants);
 * the /skins state-matrix additionally FORCES hover/active/focus statically via
 * `args.state` (see the FORCE maps below + `demoState` on the primitives). Real
 * interaction still works — forced classes are additive overrides.
 *
 * Palette: desk #F1E9D4, panel #FAF5E6, inner card #FDFAF0, ink #191308,
 * muted #5C5340, blue #3F62A7, red #A0442F, gold #B8912B, green #3A6B42,
 * dark-yellow #7D6414, tints yellow-fill #ECD77F / yellow-pale #F7EFD2.
 * Grammar: border-2 #191308 square; shadow rest 3x3 (sm 2x2), zero blur.
 * hover = lift (-1px,-1px, shadow +1px); active = sink (+2px,+2px, shadow-none).
 * disabled = dashed #B8AC8C border + bg #F1E9D4 + text #B8AC8C + shadow-none.
 * error = border/text #A0442F + bg #F8E8DC. field focus = bg #FAF5E6 + shadow 3x3.
 * non-field focus = outline-2 offset-2 #3F62A7 (blue). Fonts via CSS vars:
 * pixel = Silkscreen, mono = IBM Plex Mono, sans = Archivo.
 */
import type { PartState, RecipeArgs, RecipeResult, SkinRecipes } from "../../types.js";

const forced = (map: Partial<Record<PartState, string>>, state?: PartState): string =>
	(state && map[state]) || "";

/* ---- Button ------------------------------------------------------------- */
const BTN_BASE =
	"inline-flex items-center justify-center gap-2 rounded-none border-2 border-[#191308] whitespace-nowrap " +
	"font-[family-name:var(--skin-font-pixel)] font-bold cursor-pointer select-none " +
	"transition-[transform,box-shadow,background-color] duration-100 " +
	"hover:-translate-x-px hover:-translate-y-px " +
	"active:translate-x-[2px] active:translate-y-[2px] active:shadow-none " +
	"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F62A7] " +
	"disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-dashed disabled:border-[#B8AC8C] " +
	"disabled:bg-[#F1E9D4] disabled:text-[#B8AC8C] disabled:shadow-none";
const BTN_SIZE = {
	sm: "px-[14px] py-[6px] text-[10px] shadow-[2px_2px_0_#191308] hover:shadow-[3px_3px_0_#191308]",
	md: "px-4 py-[7px] text-[11px] shadow-[3px_3px_0_#191308] hover:shadow-[4px_4px_0_#191308]",
	lg: "px-5 py-[9px] text-[12px] shadow-[3px_3px_0_#191308] hover:shadow-[4px_4px_0_#191308]",
} as const;
const BTN_VARIANT = {
	primary: "bg-[#ECD77F] text-[#191308]",
	secondary: "bg-[#FAF5E6] text-[#191308]",
	destructive: "bg-[#A0442F] text-[#FAF5E6]",
} as const;
const BTN_FORCE: Partial<Record<PartState, string>> = {
	hover: "-translate-x-px -translate-y-px shadow-[4px_4px_0_#191308]",
	active: "translate-x-[2px] translate-y-[2px] shadow-none",
	focus: "outline outline-2 outline-offset-2 outline-[#3F62A7]",
};

export function retroOsButton(args: RecipeArgs): RecipeResult {
	const size = BTN_SIZE[(args.size as keyof typeof BTN_SIZE) ?? "md"] ?? BTN_SIZE.md;
	const variant =
		BTN_VARIANT[(args.variant as keyof typeof BTN_VARIANT) ?? "primary"] ?? BTN_VARIANT.primary;
	return { root: `${BTN_BASE} ${size} ${variant} ${forced(BTN_FORCE, args.state)}`, label: "" };
}

/* ---- Text fields (input / textarea / select) ---------------------------- */
const FIELD_BASE =
	"w-full rounded-none border-2 border-[#191308] bg-[#FDFAF0] px-3 py-[9px] " +
	"font-[family-name:var(--skin-font-mono)] text-[12.5px] text-[#191308] caret-[#191308] outline-none " +
	"placeholder:text-[#5C5340] transition-[background-color,box-shadow] duration-100 " +
	"hover:bg-[#F7EFD2] focus:bg-[#FAF5E6] focus:shadow-[3px_3px_0_#191308] " +
	"disabled:cursor-not-allowed disabled:border-dashed disabled:border-[#B8AC8C] " +
	"disabled:bg-[#F1E9D4] disabled:text-[#B8AC8C] disabled:shadow-none " +
	"aria-[invalid=true]:border-[#A0442F] aria-[invalid=true]:bg-[#F8E8DC] aria-[invalid=true]:text-[#A0442F]";
const FIELD_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-[#F7EFD2]",
	active: "bg-[#FAF5E6]",
	focus: "bg-[#FAF5E6] shadow-[3px_3px_0_#191308]",
};

export const retroOsInput = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} ${forced(FIELD_FORCE, args.state)}`,
});

export const retroOsTextarea = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} min-h-[80px] leading-relaxed resize-y ${forced(FIELD_FORCE, args.state)}`,
});

export const retroOsSelect = (args: RecipeArgs): RecipeResult => ({
	root: "relative inline-block w-full",
	field: `${FIELD_BASE} appearance-none pr-9 cursor-pointer ${forced(FIELD_FORCE, args.state)}`,
	chevron: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#191308]",
});

/* ---- Checkbox / Radio (native input + custom box) ----------------------- */
const CHOICE_ROOT =
	"inline-flex items-center gap-[10px] cursor-pointer select-none text-[13px] text-[#191308] " +
	"has-[:disabled]:cursor-not-allowed has-[:disabled]:text-[#B8AC8C]";
const CHOICE_BOX_BASE =
	"grid place-items-center h-[18px] w-[18px] shrink-0 border-2 border-[#191308] bg-[#FDFAF0] " +
	"transition-colors text-transparent " +
	"peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#3F62A7] " +
	"peer-disabled:border-dashed peer-disabled:border-[#B8AC8C] peer-disabled:bg-[#F1E9D4] " +
	"peer-aria-[invalid=true]:border-[#A0442F] peer-aria-[invalid=true]:bg-[#F8E8DC] " +
	"peer-data-[invalid=true]:border-[#A0442F] peer-data-[invalid=true]:bg-[#F8E8DC]";
const CHOICE_FORCE: Partial<Record<PartState, string>> = {
	hover: "shadow-[2px_2px_0_#191308]",
	focus: "outline outline-2 outline-offset-2 outline-[#3F62A7]",
};

export const retroOsCheckbox = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box: `${CHOICE_BOX_BASE} rounded-none peer-checked:bg-[#191308] peer-checked:text-[#FAF5E6] ${forced(CHOICE_FORCE, args.state)}`,
});

export const retroOsRadio = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box: `${CHOICE_BOX_BASE} rounded-full peer-checked:bg-[#191308] peer-checked:shadow-[inset_0_0_0_3px_#FAF5E6] ${forced(CHOICE_FORCE, args.state)}`,
});

/* ---- Switch (button role=switch) ---------------------------------------- */
const SWITCH_FORCE: Partial<Record<PartState, string>> = {
	hover: "shadow-[2px_2px_0_#191308]",
	focus: "outline outline-2 outline-offset-2 outline-[#3F62A7]",
};

export const retroOsSwitch = (args: RecipeArgs): RecipeResult => ({
	root:
		"group inline-flex h-[22px] w-[42px] shrink-0 items-center rounded-none border-2 border-[#191308] " +
		"bg-[#F1E9D4] p-px cursor-pointer transition-colors " +
		"aria-[checked=true]:bg-[#3A6B42] " +
		"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F62A7] " +
		"disabled:cursor-not-allowed disabled:border-dashed disabled:border-[#B8AC8C] disabled:bg-[#F1E9D4] disabled:shadow-none " +
		"aria-[invalid=true]:border-[#A0442F] aria-[invalid=true]:bg-[#F8E8DC] " +
		forced(SWITCH_FORCE, args.state),
	thumb:
		"h-[14px] w-[14px] rounded-none border-2 border-[#191308] bg-[#FAF5E6] " +
		"transition-transform group-aria-[checked=true]:translate-x-[22px]",
});

/* ---- Slider (native range; thumb/track in retro-os.css via .cam-range) --- */
export const retroOsSlider = (): RecipeResult => ({
	root: "cam-range w-[160px] cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
});

/* ---- Badge -------------------------------------------------------------- */
// Flat pixel tags — no leading dot (deliberate divergence from Brutal's before: dot).
const BADGE_BASE =
	"inline-flex items-center rounded-none border-2 border-[#191308] px-[7px] py-px " +
	"font-[family-name:var(--skin-font-mono)] text-[10.5px] font-bold";
const BADGE_VARIANT = {
	default: "bg-[#FDFAF0] text-[#191308]",
	solid: "bg-[#191308] text-[#FAF5E6]",
	blue: "bg-[#3F62A7] text-[#FAF5E6]",
	red: "bg-[#A0442F] text-[#FAF5E6]",
	yellow: "bg-[#B8912B] text-[#191308]",
	green: "bg-[#3A6B42] text-[#FAF5E6]",
	purple: "bg-[#7D6414] text-[#FAF5E6]",
} as const;
// The badge state row (default variant, 6 states). Forced overrides the resting look.
const BADGE_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-[#ECD77F] text-[#191308]",
	active: "bg-[#191308] text-[#FAF5E6]",
	focus: "outline outline-2 outline-offset-2 outline-[#3F62A7]",
	disabled: "border-dashed border-[#B8AC8C] bg-[#F1E9D4] text-[#B8AC8C]",
	error: "border-[#A0442F] bg-[#F8E8DC] text-[#A0442F]",
};

export function retroOsBadge(args: RecipeArgs): RecipeResult {
	const variant =
		BADGE_VARIANT[(args.variant as keyof typeof BADGE_VARIANT) ?? "default"] ??
		BADGE_VARIANT.default;
	return { root: `${BADGE_BASE} ${variant} ${forced(BADGE_FORCE, args.state)}` };
}

/* ---- Tooltip ------------------------------------------------------------ */
// Tooltip has default / focus / error variants (via args.state); no active/disabled.
const TT_TRIGGER: Partial<Record<PartState, string>> = {
	focus: "outline outline-2 outline-offset-2 outline-[#3F62A7]",
	error: "bg-[#A0442F] text-[#FAF5E6]",
};
const TT_BUBBLE: Partial<Record<PartState, string>> = {
	focus: "outline outline-2 outline-offset-2 outline-[#3F62A7]",
	error: "bg-[#A0442F] after:border-t-[#A0442F]",
};

export function retroOsTooltip(args: RecipeArgs): RecipeResult {
	return {
		root: "relative inline-flex group",
		trigger:
			"grid place-items-center h-[22px] w-[22px] rounded-none border-2 border-[#191308] " +
			"bg-[#ECD77F] text-[#191308] text-[11px] font-bold font-[family-name:var(--skin-font-pixel)] cursor-help " +
			"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F62A7] " +
			forced(TT_TRIGGER, args.state),
		bubble:
			"pointer-events-none absolute bottom-full left-1/2 mb-[9px] -translate-x-1/2 whitespace-nowrap " +
			"rounded-none border-2 border-[#191308] bg-[#191308] px-[10px] py-[5px] " +
			"font-[family-name:var(--skin-font-mono)] text-[11px] text-[#FAF5E6] " +
			"opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 " +
			"after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 " +
			"after:border-x-[6px] after:border-x-transparent after:border-t-[7px] after:border-t-[#191308] " +
			forced(TT_BUBBLE, args.state),
	};
}

/* ---- Skin registration -------------------------------------------------- */
export const retroOsRecipes: SkinRecipes = {
	button: retroOsButton,
	input: retroOsInput,
	textarea: retroOsTextarea,
	select: retroOsSelect,
	checkbox: retroOsCheckbox,
	radio: retroOsRadio,
	switch: retroOsSwitch,
	slider: retroOsSlider,
	badge: retroOsBadge,
	tooltip: retroOsTooltip,
};
