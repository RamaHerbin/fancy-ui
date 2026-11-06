/**
 * The whole hand-drawn alphabet: the exemplar plus the four glyph files, merged, with aliases so
 * that ASCII input finds the proper math glyph. Format: ../handwrite-glyph-types.ts.
 */
import type { Glyph, GlyphTable } from "../handwrite-glyph-types.js";
import { digitsSymbols } from "./digits-symbols.js";
import { exemplar } from "./exemplar.js";
import { greekMath } from "./greek-math.js";
import { lower } from "./lower.js";
import { upper } from "./upper.js";

/** Alias → glyph it borrows, used only when the alias has no glyph of its own. */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
	"-": ["−"],
	"–": ["−"],
	"*": ["·", "×"],
	"⋅": ["·"],
	"'": ["′"],
	"ϵ": ["ε"],
	"ϕ": ["φ"],
	"ϑ": ["θ"],
	"∑": ["Σ"],
	"∏": ["Π"],
	"⇒": ["→"],
	"↦": ["→"],
	"⋯": ["…"],
	"⟨": ["<"],
	"⟩": [">"],
};

function merge(): GlyphTable {
	// Exemplar last: the hand-written reference wins over any duplicate.
	const table: Record<string, Glyph> = { ...lower, ...upper, ...digitsSymbols, ...greekMath, ...exemplar };
	for (const [alias, targets] of Object.entries(ALIASES)) {
		if (alias in table) continue;
		const target = targets.find((t) => t in table);
		if (target !== undefined) table[alias] = table[target]!;
	}
	if (!(" " in table)) table[" "] = { adv: 0.3, strokes: [] };
	return table;
}

export const glyphs: GlyphTable = merge();
