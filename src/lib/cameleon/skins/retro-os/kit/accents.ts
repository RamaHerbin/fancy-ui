/**
 * The four accents — the whole color decision surface of the retro-os kit.
 *
 * Kit components take an `Accent` rather than a CSS color so the choice stays
 * nameable ("this section is the blue one") and so a section, its titlebar
 * dot, its cards' hover shadows and their tag fills cannot drift apart.
 *
 * Prefer `import type { Accent }` where only the type is needed — a type-only
 * import is erased entirely and can never form a module cycle.
 */
export type Accent = "blue" | "rust" | "gold" | "green";

/** Accent → the saturated ink used for dots, chips and hover shadows. */
export const ACCENT_VAR: Record<Accent, string> = {
	blue: "var(--r-blue)",
	rust: "var(--r-rust)",
	gold: "var(--r-gold)",
	green: "var(--r-green)",
};

/**
 * Accent → its pale wash, used for fills large enough that the saturated
 * value would take over the page (card tints, tag pills, titlebar
 * backgrounds). Paired 1:1 with ACCENT_VAR on purpose: a tint that does not
 * belong to the section's accent is the single most visible way this design
 * goes wrong.
 */
export const ACCENT_TINT: Record<Accent, string> = {
	blue: "var(--r-tint-blue)",
	rust: "var(--r-tint-rust)",
	gold: "var(--r-tint-gold)",
	green: "var(--r-tint-green)",
};

/** `accentVar("rust")` → `"var(--r-rust)"`. */
export function accentVar(accent: Accent): string {
	return ACCENT_VAR[accent];
}

/** `accentTint("rust")` → `"var(--r-tint-rust)"`. */
export function accentTint(accent: Accent): string {
	return ACCENT_TINT[accent];
}
