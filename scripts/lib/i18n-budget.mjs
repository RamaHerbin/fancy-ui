/**
 * Length budget for short UI labels, shared by the quality test and the
 * translator context export. No Node imports, so the TypeScript side can use it.
 */

/** Key prefixes whose messages are short UI labels (buttons, headings, chips) with little room. */
export const BUDGET_PREFIXES = [
	"nav.",
	"a11y.",
	"header.",
	"theme.",
	"language.",
	"skin.",
	"action.",
	"toc.",
	"status.",
	"group.",
	"category.",
	"table.",
	"footer.",
	"jobs.",
	"rail.",
	"retro.",
	"comp.",
	"tg.",
	"search.",
	"gallery.",
	"intro.category.",
	"intro.pill.",
	"install.pill.",
	"theming.pill.",
	"intro.nextSteps.",
	"install.nextSteps.",
];

/** Only messages this short (English, code points) are budgeted: longer ones are sentences. */
export const SHORT_LABEL_MAX = 40;

/** @param {string} s */
export const lengthOf = (s) => [...s].length;

/** Longest allowed translation of an English label of `enLength` characters. */
export function lengthBudget(/** @type {number} */ enLength) {
	return Math.max(Math.ceil(1.6 * enLength), enLength + 12);
}

/**
 * The computed budget for a key, or null when the key is not a short label.
 * @param {string} key
 * @param {string} enValue
 * @returns {number | null}
 */
export function budgetFor(key, enValue) {
	if (lengthOf(enValue) > SHORT_LABEL_MAX) return null;
	if (!BUDGET_PREFIXES.some((p) => key.startsWith(p))) return null;
	return lengthBudget(lengthOf(enValue));
}
