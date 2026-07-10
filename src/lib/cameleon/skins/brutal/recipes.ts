/**
 * Brutal recipes — the full "Core components" set from the design system.
 * Static class literals only (Tailwind JIT-safe). States are attribute-driven
 * for real interaction (disabled/aria-invalid/aria-checked + hover/focus/peer/
 * group variants); the /skins state-matrix additionally FORCES hover/active/focus
 * statically via `args.state` (see the FORCE maps below + `demoState` on the
 * primitives). Real interaction still works; forced classes are additive.
 *
 * Design tokens: paper #F4EEE0, card #FBF7EB, surface #FFFCF2, ink #141414,
 * accents blue #1B6EF3 / red #E5372B / yellow #F5B40C / green #12A147 / purple
 * #8E55E9. Focus ring 0 0 0 3px rgba(27,110,243,.35). Error ring rgba(229,55,43,.28).
 */
import type { PartState, RecipeArgs, RecipeResult } from "../../types.js";

const forced = (map: Partial<Record<PartState, string>>, state?: PartState): string =>
	(state && map[state]) || "";

/* ---- Button ------------------------------------------------------------- */
const BTN_BASE =
	"inline-flex items-center justify-center gap-[7px] rounded-full border-[1.5px] " +
	"font-extrabold tracking-[-0.01em] whitespace-nowrap cursor-pointer select-none " +
	"transition-[transform,box-shadow] duration-150 ease-out " +
	"hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 " +
	"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(27,110,243,0.45)] " +
	"disabled:pointer-events-none disabled:cursor-not-allowed";
const BTN_SIZE = {
	sm: "px-[13px] py-[6px] text-[11px]",
	md: "px-[18px] py-[9px] text-[12.5px]",
	lg: "px-[22px] py-[11px] text-[14px]",
} as const;
const BTN_VARIANT = {
	primary:
		"border-[#141414] bg-[#141414] text-[#F4EEE0] shadow-[0_4px_10px_rgba(60,50,20,0.1)] " +
		"hover:shadow-[4px_4px_0_#141414] active:bg-black active:shadow-[0_1px_0_#141414] " +
		"disabled:border-[rgba(20,20,20,0.25)] disabled:bg-[rgba(20,20,20,0.22)] disabled:text-[rgba(20,20,20,0.4)] disabled:shadow-none",
	secondary:
		"border-[#141414] bg-[#FFFCF2] text-[#141414] shadow-[0_4px_10px_rgba(60,50,20,0.1)] " +
		"hover:shadow-[4px_4px_0_#141414] active:shadow-[0_1px_0_#141414] disabled:opacity-50 disabled:shadow-none",
	destructive:
		"border-[#141414] bg-[#E5372B] text-white shadow-[0_4px_10px_rgba(60,50,20,0.1)] " +
		"hover:shadow-[4px_4px_0_#141414] active:shadow-[0_1px_0_#141414] disabled:opacity-50 disabled:shadow-none",
} as const;
const BTN_FORCE: Partial<Record<PartState, string>> = {
	hover: "-translate-x-0.5 -translate-y-0.5 shadow-[4px_4px_0_#141414]",
	active: "bg-black shadow-[0_1px_0_#141414]",
	focus: "border-[#1B6EF3] ring-[3px] ring-[rgba(27,110,243,0.45)]",
};

export function brutalButton(args: RecipeArgs): RecipeResult {
	const size = BTN_SIZE[(args.size as keyof typeof BTN_SIZE) ?? "md"] ?? BTN_SIZE.md;
	const variant =
		BTN_VARIANT[(args.variant as keyof typeof BTN_VARIANT) ?? "primary"] ?? BTN_VARIANT.primary;
	return { root: `${BTN_BASE} ${size} ${variant} ${forced(BTN_FORCE, args.state)}`, label: "" };
}

/* ---- Text fields (input / textarea / select) ---------------------------- */
const FIELD_BASE =
	"w-full rounded-lg border-[1.5px] border-[#141414] bg-[#FFFCF2] px-[11px] py-2 " +
	"text-[12px] font-semibold text-[#141414] outline-none " +
	"transition-[box-shadow,border-color,background] duration-150 " +
	"placeholder:text-[#141414]/40 " +
	"hover:bg-white hover:shadow-[0_3px_8px_rgba(60,50,20,0.12)] " +
	"focus:border-[#1B6EF3] focus:shadow-[0_0_0_3px_rgba(27,110,243,0.35)] " +
	"disabled:bg-[#EAE3D2] disabled:text-[#141414]/40 disabled:border-[#141414]/30 disabled:shadow-none disabled:cursor-not-allowed " +
	"aria-[invalid=true]:border-[#E5372B] aria-[invalid=true]:shadow-[0_0_0_3px_rgba(229,55,43,0.28)]";
const FIELD_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-white shadow-[0_3px_8px_rgba(60,50,20,0.12)]",
	active: "bg-white",
	focus: "border-[#1B6EF3] shadow-[0_0_0_3px_rgba(27,110,243,0.35)]",
};

export const brutalInput = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} ${forced(FIELD_FORCE, args.state)}`,
});

export const brutalTextarea = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} min-h-[80px] leading-relaxed resize-y ${forced(FIELD_FORCE, args.state)}`,
});

export const brutalSelect = (args: RecipeArgs): RecipeResult => ({
	root: "relative inline-block w-full",
	field: `${FIELD_BASE} appearance-none pr-9 cursor-pointer ${forced(FIELD_FORCE, args.state)}`,
	chevron: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#141414]",
});

/* ---- Checkbox / Radio (native input + custom box) ----------------------- */
const CHOICE_ROOT =
	"inline-flex items-center gap-2 cursor-pointer select-none text-[12px] font-semibold text-[#141414] " +
	"has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";
const CHOICE_BOX_BASE =
	"grid place-items-center h-[18px] w-[18px] shrink-0 border-[1.5px] border-[#141414] bg-[#FFFCF2] " +
	"transition-colors text-transparent " +
	"peer-focus-visible:shadow-[0_0_0_3px_rgba(27,110,243,0.35)] " +
	"peer-disabled:bg-[#EAE3D2] peer-disabled:border-[#141414]/30 " +
	"peer-aria-[invalid=true]:border-[#E5372B] peer-aria-[invalid=true]:shadow-[0_0_0_3px_rgba(229,55,43,0.28)] " +
	"peer-data-[invalid=true]:border-[#E5372B] peer-data-[invalid=true]:shadow-[0_0_0_3px_rgba(229,55,43,0.28)]";
const CHOICE_FORCE: Partial<Record<PartState, string>> = {
	hover: "shadow-[2px_2px_0_rgba(20,20,20,0.3)]",
	focus: "border-[#1B6EF3] shadow-[0_0_0_3px_rgba(27,110,243,0.35)]",
};

export const brutalCheckbox = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box: `${CHOICE_BOX_BASE} rounded-[4px] peer-checked:bg-[#141414] peer-checked:text-[#FFFCF2] ${forced(CHOICE_FORCE, args.state)}`,
});

export const brutalRadio = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box: `${CHOICE_BOX_BASE} rounded-full peer-checked:bg-[#141414] ${forced(CHOICE_FORCE, args.state)}`,
});

/* ---- Switch (button role=switch) ---------------------------------------- */
const SWITCH_FORCE: Partial<Record<PartState, string>> = {
	hover: "shadow-[2px_2px_0_rgba(20,20,20,0.3)]",
	focus: "border-[#1B6EF3] shadow-[0_0_0_3px_rgba(27,110,243,0.35)]",
};

export const brutalSwitch = (args: RecipeArgs): RecipeResult => ({
	root:
		"group inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full border-[1.5px] border-[#141414] " +
		"bg-[#FFFCF2] p-[2px] cursor-pointer transition-colors " +
		"aria-[checked=true]:bg-[#1B6EF3] " +
		"focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(27,110,243,0.35)] " +
		"disabled:bg-[#EAE3D2] disabled:cursor-not-allowed " +
		"aria-[invalid=true]:border-[#E5372B] aria-[invalid=true]:shadow-[0_0_0_3px_rgba(229,55,43,0.28)] " +
		forced(SWITCH_FORCE, args.state),
	thumb:
		"h-[14px] w-[14px] rounded-full border-[1.5px] border-[#141414] bg-white " +
		"transition-transform group-aria-[checked=true]:translate-x-[18px]",
});

/* ---- Slider (native range; thumb/track in brutal.css via .cam-range) ----- */
export const brutalSlider = (): RecipeResult => ({
	root: "cam-range w-[160px] cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
});

/* ---- Badge -------------------------------------------------------------- */
const BADGE_BASE =
	"inline-flex items-center rounded-full border-[1.5px] px-[10px] py-[3px] text-[11px] font-bold " +
	"before:content-[''] before:mr-[6px] before:h-[7px] before:w-[7px] before:rounded-full before:shrink-0";
const BADGE_VARIANT = {
	default: "border-[#141414] bg-[#FFFCF2] text-[#141414] before:bg-[#141414]",
	solid: "border-[#141414] bg-[#141414] text-[#F4EEE0] before:bg-[#F4EEE0]",
	blue: "border-[#1B6EF3] bg-[#FFFCF2] text-[#1B6EF3] before:bg-[#1B6EF3]",
	red: "border-[#E5372B] bg-[#FFFCF2] text-[#E5372B] before:bg-[#E5372B]",
	yellow: "border-[#F5B40C] bg-[#FFFCF2] text-[#9A7100] before:bg-[#F5B40C]",
	green: "border-[#12A147] bg-[#FFFCF2] text-[#12A147] before:bg-[#12A147]",
	purple: "border-[#8E55E9] bg-[#FFFCF2] text-[#6E35C8] before:bg-[#8E55E9]",
} as const;
// The badge state row (default variant, 6 states). Forced overrides the resting look.
const BADGE_FORCE: Partial<Record<PartState, string>> = {
	hover: "shadow-[2px_2px_0_rgba(20,20,20,0.3)]",
	active: "bg-[#141414] text-[#F4EEE0] before:bg-[#F4EEE0]",
	focus: "border-[#1B6EF3] shadow-[0_0_0_3px_rgba(27,110,243,0.35)]",
	disabled: "border-[rgba(20,20,20,0.3)] bg-[#EAE3D2] text-[rgba(20,20,20,0.4)] before:bg-[rgba(20,20,20,0.3)]",
	error: "border-[#E5372B] bg-[#FDECEA] text-[#C42B20] before:bg-[#E5372B]",
};

export function brutalBadge(args: RecipeArgs): RecipeResult {
	const variant =
		BADGE_VARIANT[(args.variant as keyof typeof BADGE_VARIANT) ?? "default"] ?? BADGE_VARIANT.default;
	return { root: `${BADGE_BASE} ${variant} ${forced(BADGE_FORCE, args.state)}` };
}

/* ---- Tooltip ------------------------------------------------------------ */
// Tooltip has default / focus / error variants (via args.state); no active/disabled.
const TT_TRIGGER: Partial<Record<PartState, string>> = {
	focus: "border-[#1B6EF3] bg-[#FFFCF2] text-[#1B6EF3] shadow-[0_0_0_3px_rgba(27,110,243,0.3)]",
	error: "border-[#E5372B] bg-[#FFFCF2] text-[#E5372B]",
};
const TT_BUBBLE: Partial<Record<PartState, string>> = {
	focus: "border-[#1B6EF3] shadow-[0_0_0_3px_rgba(27,110,243,0.35)]",
	error: "bg-[#E5372B] border-[#E5372B]",
};

export function brutalTooltip(args: RecipeArgs): RecipeResult {
	return {
		root: "relative inline-flex group",
		trigger:
			"grid place-items-center h-[26px] w-[26px] rounded-full border-[1.5px] border-[#141414] " +
			"bg-[#1B6EF3] text-white text-[12px] font-bold cursor-help " +
			"focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(27,110,243,0.35)] " +
			forced(TT_TRIGGER, args.state),
		bubble:
			"pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap " +
			"rounded-lg border-[1.5px] border-[#141414] bg-[#141414] px-3 py-1.5 text-[12px] font-semibold text-[#F4EEE0] " +
			"opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 " +
			"shadow-[0_10px_18px_rgba(60,50,20,0.15)] " +
			forced(TT_BUBBLE, args.state),
	};
}
