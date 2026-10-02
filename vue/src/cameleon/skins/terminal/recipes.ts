/**
 * Terminal recipes — the full "Core components" set in the CRT art direction:
 * square (`rounded-none`), monospace, uppercase, green-on-black, NO motion
 * (`transition-none`, except the switch thumb translate). Glow + blinking caret
 * come from terminal.css / ornaments.
 *
 * Static class literals only (Tailwind JIT-safe). States are attribute-driven:
 * primitives set `disabled`, `aria-invalid`, `aria-checked` and Tailwind's
 * state variants (hover, focus, peer-, group-, disabled, aria) do the rest.
 *
 * Palette: green #22c55e / bright green #4ade80, black bg, dim green #14532d,
 * error red #f87171. Focus = green outline (not ring). Error = red border/outline.
 */
import type { PartState, RecipeArgs, RecipeResult, SkinRecipes } from "../../types.js";

const forced = (map: Partial<Record<PartState, string>>, state?: PartState): string =>
	(state && map[state]) || "";

/* ---- Button ------------------------------------------------------------- */
const BTN_BASE =
	"inline-flex items-center justify-center gap-2 rounded-none border font-mono uppercase " +
	"tracking-widest whitespace-nowrap cursor-pointer select-none transition-none " +
	"focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 " +
	"disabled:opacity-40 disabled:pointer-events-none";

const BTN_SIZE = {
	sm: "px-3 py-1.5 text-[11px]",
	md: "px-4 py-2 text-xs",
	lg: "px-5 py-2.5 text-sm",
} as const;

const BTN_VARIANT = {
	primary:
		"border-[#22c55e] bg-black text-[#4ade80] hover:bg-[#22c55e] hover:text-black " +
		"focus-visible:outline-[#22c55e]",
	secondary:
		"border-[#14532d] bg-transparent text-[#4ade80]/80 hover:border-[#22c55e] hover:text-[#4ade80] " +
		"focus-visible:outline-[#22c55e]",
	destructive:
		"border-[#f87171] bg-black text-[#f87171] hover:bg-[#f87171] hover:text-black " +
		"focus-visible:outline-[#f87171]",
} as const;

const BTN_FORCE: Partial<Record<PartState, string>> = {
	hover: "bg-[#22c55e] text-black",
	active: "bg-[#4ade80] text-black",
	focus: "outline outline-1 outline-offset-2 outline-[#22c55e]",
};

export function terminalButton(args: RecipeArgs): RecipeResult {
	const size = BTN_SIZE[(args.size as keyof typeof BTN_SIZE) ?? "md"] ?? BTN_SIZE.md;
	const variant =
		BTN_VARIANT[(args.variant as keyof typeof BTN_VARIANT) ?? "primary"] ?? BTN_VARIANT.primary;
	return { root: `${BTN_BASE} ${size} ${variant} ${forced(BTN_FORCE, args.state)}`, label: "" };
}

/* ---- Text fields (input / textarea / select) ---------------------------- */
const FIELD_BASE =
	"w-full rounded-none border border-[#22c55e] bg-black px-3 py-2 " +
	"text-xs font-mono text-[#4ade80] outline-none transition-none " +
	"caret-[#22c55e] placeholder:text-[#4ade80]/40 " +
	"hover:border-[#4ade80] " +
	"focus:outline focus:outline-1 focus:outline-offset-0 focus:outline-[#22c55e] " +
	"disabled:opacity-40 disabled:cursor-not-allowed disabled:border-[#14532d] disabled:text-[#4ade80]/40 " +
	"aria-[invalid=true]:border-[#f87171] aria-[invalid=true]:focus:outline-[#f87171]";
const FIELD_FORCE: Partial<Record<PartState, string>> = {
	hover: "border-[#4ade80]",
	focus: "outline outline-1 outline-offset-0 outline-[#22c55e]",
};

export const terminalInput = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} ${forced(FIELD_FORCE, args.state)}`,
});

export const terminalTextarea = (args: RecipeArgs): RecipeResult => ({
	root: `${FIELD_BASE} min-h-[80px] leading-relaxed resize-y ${forced(FIELD_FORCE, args.state)}`,
});

export const terminalSelect = (args: RecipeArgs): RecipeResult => ({
	root: "relative inline-block w-full",
	field: `${FIELD_BASE} appearance-none pr-9 cursor-pointer ${forced(FIELD_FORCE, args.state)}`,
	chevron: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#22c55e]",
});

/* ---- Checkbox / Radio (native input + custom box) ----------------------- */
const CHOICE_ROOT =
	"inline-flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-[#4ade80] " +
	"has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";
const CHOICE_BOX_BASE =
	"grid place-items-center h-[18px] w-[18px] shrink-0 border border-[#22c55e] bg-black " +
	"transition-none text-transparent " +
	"peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#22c55e] " +
	"peer-disabled:opacity-40 peer-disabled:border-[#14532d] " +
	"peer-aria-[invalid=true]:border-[#f87171] " +
	"peer-data-[invalid=true]:border-[#f87171]";
const CHOICE_FORCE: Partial<Record<PartState, string>> = {
	hover: "border-[#4ade80]",
	focus: "outline outline-1 outline-offset-2 outline-[#22c55e]",
};

export const terminalCheckbox = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box: `${CHOICE_BOX_BASE} rounded-none peer-checked:bg-[#22c55e] peer-checked:text-black ${forced(CHOICE_FORCE, args.state)}`,
});

export const terminalRadio = (args: RecipeArgs): RecipeResult => ({
	root: CHOICE_ROOT,
	box: `${CHOICE_BOX_BASE} rounded-full peer-checked:bg-[#22c55e] ${forced(CHOICE_FORCE, args.state)}`,
});

/* ---- Switch (button role=switch) ---------------------------------------- */
const SWITCH_FORCE: Partial<Record<PartState, string>> = {
	hover: "border-[#4ade80]",
	focus: "outline outline-1 outline-offset-2 outline-[#22c55e]",
};

export const terminalSwitch = (args: RecipeArgs): RecipeResult => ({
	root:
		"group inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-none border border-[#22c55e] " +
		"bg-black p-[2px] cursor-pointer transition-none " +
		"aria-[checked=true]:bg-[#22c55e] " +
		"focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#22c55e] " +
		"disabled:opacity-40 disabled:cursor-not-allowed " +
		"aria-[invalid=true]:border-[#f87171] " +
		forced(SWITCH_FORCE, args.state),
	thumb:
		"h-[14px] w-[14px] rounded-none border border-[#22c55e] bg-[#4ade80] " +
		"transition-transform group-aria-[checked=true]:translate-x-[18px] group-aria-[checked=true]:bg-black group-aria-[checked=true]:border-black",
});

/* ---- Slider (native range; thumb/track in terminal.css via .cam-range) --- */
export const terminalSlider = (): RecipeResult => ({
	root: "cam-range w-[160px] cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
});

/* ---- Badge -------------------------------------------------------------- */
const BADGE_BASE =
	"inline-flex items-center rounded-none border px-[10px] py-[3px] text-[11px] font-mono uppercase tracking-widest " +
	"before:content-[''] before:mr-[6px] before:h-[7px] before:w-[7px] before:rounded-none before:shrink-0";
const BADGE_VARIANT = {
	default: "border-[#22c55e] bg-black text-[#4ade80] before:bg-[#4ade80]",
	solid: "border-[#22c55e] bg-[#22c55e] text-black before:bg-black",
	blue: "border-[#38bdf8] bg-black text-[#38bdf8] before:bg-[#38bdf8]",
	red: "border-[#f87171] bg-black text-[#f87171] before:bg-[#f87171]",
	yellow: "border-[#facc15] bg-black text-[#facc15] before:bg-[#facc15]",
	green: "border-[#22c55e] bg-black text-[#4ade80] before:bg-[#22c55e]",
	purple: "border-[#a78bfa] bg-black text-[#a78bfa] before:bg-[#a78bfa]",
} as const;

// The badge state row (default variant, 6 states). Forced overrides the resting look.
const BADGE_FORCE: Partial<Record<PartState, string>> = {
	hover: "border-[#4ade80] text-[#4ade80] before:bg-[#4ade80]",
	active: "bg-[#22c55e] text-black before:bg-black",
	focus: "outline outline-1 outline-offset-2 outline-[#22c55e]",
	disabled: "border-[#14532d] text-[#4ade80]/40 before:bg-[#14532d]",
	error: "border-[#f87171] text-[#f87171] before:bg-[#f87171]",
};

export function terminalBadge(args: RecipeArgs): RecipeResult {
	const variant =
		BADGE_VARIANT[(args.variant as keyof typeof BADGE_VARIANT) ?? "default"] ??
		BADGE_VARIANT.default;
	return { root: `${BADGE_BASE} ${variant} ${forced(BADGE_FORCE, args.state)}` };
}

/* ---- Tooltip ------------------------------------------------------------ */
// Tooltip has default / focus / error variants (via args.state); no active/disabled.
const TT_TRIGGER: Partial<Record<PartState, string>> = {
	focus: "outline outline-1 outline-offset-2 outline-[#22c55e]",
	error: "border-[#f87171] text-[#f87171]",
};
const TT_BUBBLE: Partial<Record<PartState, string>> = {
	focus: "outline outline-1 outline-offset-2 outline-[#22c55e]",
	error: "border-[#f87171] text-[#f87171]",
};

export function terminalTooltip(args: RecipeArgs): RecipeResult {
	return {
		root: "relative inline-flex group",
		trigger:
			"grid place-items-center h-[26px] w-[26px] rounded-none border border-[#22c55e] " +
			"bg-black text-[#4ade80] text-xs font-mono font-bold cursor-help " +
			"focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#22c55e] " +
			forced(TT_TRIGGER, args.state),
		bubble:
			"pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap " +
			"rounded-none border border-[#22c55e] bg-black px-3 py-1.5 text-xs font-mono text-[#4ade80] " +
			"opacity-0 transition-none group-hover:opacity-100 group-focus-within:opacity-100 " +
			forced(TT_BUBBLE, args.state),
	};
}

/* ---- Skin registration -------------------------------------------------- */
export const terminalRecipes: SkinRecipes = {
	button: terminalButton,
	input: terminalInput,
	textarea: terminalTextarea,
	select: terminalSelect,
	checkbox: terminalCheckbox,
	radio: terminalRadio,
	switch: terminalSwitch,
	slider: terminalSlider,
	badge: terminalBadge,
	tooltip: terminalTooltip,
};
